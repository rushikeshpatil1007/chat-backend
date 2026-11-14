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

  if (typeof senderId !== "string" || typeof text !== "string" || !(createdAt instanceof Timestamp)) {
    throw new Error("Stored Firestore message has an invalid shape");
  }

  return { messageId, senderId, text, createdAt: createdAt.toDate().toISOString() };
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
