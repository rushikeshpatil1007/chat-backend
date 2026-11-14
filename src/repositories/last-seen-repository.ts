import {
  FieldValue,
  Timestamp,
  type DocumentData
} from "firebase-admin/firestore";
import { ApiError } from "../errors/api-error";
import { getFirestoreDb } from "../lib/firebase";

export interface LastSeenMarker {
  userId: string;
  messageId: string;
  messageCreatedAt: string;
  lastSeenAt: string;
}

export interface UpdateLastSeenResult {
  marker: LastSeenMarker;
  advanced: boolean;
}

function comparePosition(
  leftTimestamp: Timestamp,
  leftMessageId: string,
  rightTimestamp: Timestamp,
  rightMessageId: string
): number {
  if (leftTimestamp.seconds !== rightTimestamp.seconds) {
    return leftTimestamp.seconds - rightTimestamp.seconds;
  }

  if (leftTimestamp.nanoseconds !== rightTimestamp.nanoseconds) {
    return leftTimestamp.nanoseconds - rightTimestamp.nanoseconds;
  }

  if (leftMessageId === rightMessageId) {
    return 0;
  }

  return leftMessageId < rightMessageId ? -1 : 1;
}

function toLastSeenMarker(data: DocumentData | undefined): LastSeenMarker {
  const userId: unknown = data?.userId;
  const messageId: unknown = data?.messageId;
  const messageCreatedAt: unknown = data?.messageCreatedAt;
  const lastSeenAt: unknown = data?.lastSeenAt;

  if (
    typeof userId !== "string" ||
    typeof messageId !== "string" ||
    !(messageCreatedAt instanceof Timestamp) ||
    !(lastSeenAt instanceof Timestamp)
  ) {
    throw new Error("Stored Firestore last-seen marker has an invalid shape");
  }

  return {
    userId,
    messageId,
    messageCreatedAt: messageCreatedAt.toDate().toISOString(),
    lastSeenAt: lastSeenAt.toDate().toISOString()
  };
}

export async function advanceLastSeen(
  chatId: string,
  userId: string,
  messageId: string
): Promise<UpdateLastSeenResult> {
  const firestore = getFirestoreDb();
  const chatReference = firestore.collection("chats").doc(chatId);
  const messageReference = chatReference.collection("messages").doc(messageId);
  const markerReference = chatReference.collection("lastSeen").doc(userId);

  const advanced = await firestore.runTransaction(async (transaction) => {
    const requestedMessage = await transaction.get(messageReference);
    if (!requestedMessage.exists) {
      throw new ApiError(404, "Message was not found in this chat");
    }

    const requestedCreatedAt: unknown = requestedMessage.get("createdAt");
    if (!(requestedCreatedAt instanceof Timestamp)) {
      throw new Error("Stored Firestore message has an invalid timestamp");
    }

    const currentMarker = await transaction.get(markerReference);
    if (currentMarker.exists) {
      const currentCreatedAt: unknown = currentMarker.get("messageCreatedAt");
      const currentMessageId: unknown = currentMarker.get("messageId");

      if (!(currentCreatedAt instanceof Timestamp) || typeof currentMessageId !== "string") {
        throw new Error("Stored Firestore last-seen marker has an invalid position");
      }

      if (
        comparePosition(
          requestedCreatedAt,
          messageId,
          currentCreatedAt,
          currentMessageId
        ) <= 0
      ) {
        return false;
      }
    }

    transaction.set(markerReference, {
      userId,
      messageId,
      messageCreatedAt: requestedCreatedAt,
      lastSeenAt: FieldValue.serverTimestamp()
    });

    return true;
  });

  const marker = await markerReference.get();
  if (!marker.exists) {
    throw new Error("Firestore last-seen marker was not saved");
  }

  return { marker: toLastSeenMarker(marker.data()), advanced };
}
