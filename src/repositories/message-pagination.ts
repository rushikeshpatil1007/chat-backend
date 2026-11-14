import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError } from "../errors/api-error";

const cursorPayloadSchema = z.object({
  seconds: z.number().int().nonnegative(),
  nanoseconds: z.number().int().min(0).max(999_999_999),
  messageId: z.string().min(1).max(1500)
});

export interface MessageCursor {
  timestamp: Timestamp;
  messageId: string;
}

export function encodeMessageCursor(timestamp: Timestamp, messageId: string): string {
  const payload = { seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds, messageId };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeMessageCursor(value: string): MessageCursor {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const payload = cursorPayloadSchema.parse(JSON.parse(decoded) as unknown);

    return {
      timestamp: new Timestamp(payload.seconds, payload.nanoseconds),
      messageId: payload.messageId
    };
  } catch {
    throw new ApiError(400, "The messages cursor is invalid");
  }
}
