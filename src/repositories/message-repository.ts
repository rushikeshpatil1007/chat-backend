import { createHash } from "node:crypto";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { ApiError } from "../errors/api-error";
import { getFirestoreDb } from "../lib/firebase";
import { decodeMessageCursor, encodeMessageCursor } from "./message-pagination";

export interface StoredMessage {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface StoreMessageResult {
  message: StoredMessage;
  created: boolean;
}

export interface MessagePage {
  messages: StoredMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code: unknown = error.code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

function readStoredMessage(
  messageId: string,
  data: FirebaseFirestore.DocumentData | undefined
): StoredMessage {
  const senderId: unknown = data?.senderId;
  const text: unknown = data?.text;
  const createdAt: unknown = data?.createdAt;
  const editedAt: unknown = data?.editedAt;
  const deletedAt: unknown = data?.deletedAt;

  if (typeof senderId !== "string" || typeof text !== "string" || !(createdAt instanceof Timestamp)) {
    throw new Error("Stored Firestore message has an invalid shape");
  }

  if (editedAt !== undefined && editedAt !== null && !(editedAt instanceof Timestamp)) {
    throw new Error("Stored Firestore message has an invalid edit timestamp");
  }
  if (deletedAt !== undefined && deletedAt !== null && !(deletedAt instanceof Timestamp)) {
    throw new Error("Stored Firestore message has an invalid delete timestamp");
  }

  return {
    messageId,
    senderId,
    text,
    createdAt: createdAt.toDate().toISOString(),
    editedAt: editedAt instanceof Timestamp ? editedAt.toDate().toISOString() : null,
    deletedAt: deletedAt instanceof Timestamp ? deletedAt.toDate().toISOString() : null
  };
}

export async function storeMessage(
  chatId: string,
  senderId: string,
  text: string,
  idempotencyKey?: string
): Promise<StoreMessageResult> {
  const messages = getFirestoreDb().collection("chats").doc(chatId).collection("messages");
  const messageId = idempotencyKey
    ? createHash("sha256").update(`${chatId}:${senderId}:${idempotencyKey}`).digest("hex")
    : undefined;
  const reference = messageId ? messages.doc(messageId) : messages.doc();

  try {
    await reference.create({
      senderId,
      text,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error: unknown) {
    if (!messageId || !isAlreadyExistsError(error)) {
      throw error;
    }

    const existing = await reference.get();
    const message = readStoredMessage(existing.id, existing.data());

    if (message.senderId !== senderId || message.text !== text) {
      throw new ApiError(409, "This idempotency key was already used for a different message");
    }

    return { message, created: false };
  }

  const snapshot = await reference.get();
  return { message: readStoredMessage(snapshot.id, snapshot.data()), created: true };
}

export async function editStoredMessage(
  chatId: string,
  messageId: string,
  senderId: string,
  text: string
): Promise<StoredMessage> {
  const reference = getFirestoreDb()
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .doc(messageId);

  await getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new ApiError(404, "Message was not found in this chat");
    if (snapshot.get("senderId") !== senderId) {
      throw new ApiError(403, "You can only edit your own messages");
    }
    if (snapshot.get("deletedAt")) {
      throw new ApiError(409, "A deleted message cannot be edited");
    }

    transaction.update(reference, { text, editedAt: FieldValue.serverTimestamp() });
  });

  const updated = await reference.get();
  return readStoredMessage(updated.id, updated.data());
}

export async function deleteStoredMessage(
  chatId: string,
  messageId: string,
  senderId: string
): Promise<StoredMessage> {
  const reference = getFirestoreDb()
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .doc(messageId);

  await getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new ApiError(404, "Message was not found in this chat");
    if (snapshot.get("senderId") !== senderId) {
      throw new ApiError(403, "You can only delete your own messages");
    }
    if (snapshot.get("deletedAt")) {
      throw new ApiError(409, "Message is already deleted");
    }

    transaction.update(reference, { text: "", deletedAt: FieldValue.serverTimestamp() });
  });

  const updated = await reference.get();
  return readStoredMessage(updated.id, updated.data());
}

export async function getMessagePage(
  chatId: string,
  limit: number,
  cursorValue?: string
): Promise<MessagePage> {
  const messages = getFirestoreDb().collection("chats").doc(chatId).collection("messages");
  let query = messages
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "desc");

  if (cursorValue) {
    const cursor = decodeMessageCursor(cursorValue);
    query = query.startAfter(cursor.timestamp, cursor.messageId);
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const pageDocuments = snapshot.docs.slice(0, limit);
  const oldestDocument = pageDocuments.at(-1);
  let nextCursor: string | null = null;

  if (hasMore && oldestDocument) {
    const timestamp: unknown = oldestDocument.get("createdAt");
    if (!(timestamp instanceof Timestamp)) {
      throw new Error("Stored Firestore message has an invalid timestamp");
    }

    nextCursor = encodeMessageCursor(timestamp, oldestDocument.id);
  }

  return {
    messages: pageDocuments
      .reverse()
      .map((document) => readStoredMessage(document.id, document.data())),
    hasMore,
    nextCursor
  };
}
