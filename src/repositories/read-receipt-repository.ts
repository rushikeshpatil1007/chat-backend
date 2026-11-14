import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ApiError } from "../errors/api-error";
import { getFirestoreDb } from "../lib/firebase";

export interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: string;
}

export interface SaveReadReceiptResult {
  receipt: ReadReceipt;
  created: boolean;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code: unknown = error.code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

function toReadReceipt(messageId: string, userId: string, value: unknown): ReadReceipt {
  if (!(value instanceof Timestamp)) {
    throw new Error("Stored Firestore read receipt has an invalid timestamp");
  }

  return { messageId, userId, readAt: value.toDate().toISOString() };
}

export async function saveReadReceipt(
  chatId: string,
  messageId: string,
  userId: string
): Promise<SaveReadReceiptResult> {
  const firestore = getFirestoreDb();
  const messageReference = firestore
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .doc(messageId);
  const message = await messageReference.get();

  if (!message.exists) {
    throw new ApiError(404, "Message was not found in this chat");
  }

  const receiptReference = messageReference.collection("readReceipts").doc(userId);

  try {
    await receiptReference.create({ userId, readAt: FieldValue.serverTimestamp() });
    const receipt = await receiptReference.get();

    return {
      receipt: toReadReceipt(messageId, userId, receipt.get("readAt")),
      created: true
    };
  } catch (error: unknown) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }

    const existingReceipt = await receiptReference.get();
    return {
      receipt: toReadReceipt(messageId, userId, existingReceipt.get("readAt")),
      created: false
    };
  }
}
