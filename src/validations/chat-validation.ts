import { z } from "zod";

export const createChatBodySchema = z
  .object({
    userAId: z.string().uuid(),
    userBId: z.string().uuid()
  })
  .strict()
  .refine((body) => body.userAId.toLowerCase() !== body.userBId.toLowerCase(), {
    message: "A chat requires two different users"
  });

export type CreateChatBody = z.infer<typeof createChatBodySchema>;

export const sendMessageParamsSchema = z.object({
  chatId: z.string().uuid()
});

export const sendMessageBodySchema = z
  .object({
    senderId: z.string().uuid(),
    text: z.string().trim().min(1).max(5000)
  })
  .strict();

export const idempotencyKeySchema = z.string().trim().min(1).max(128);

export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;

export const getMessagesParamsSchema = z.object({
  chatId: z.string().uuid()
});

export const getMessagesQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a positive integer")
    .optional()
    .transform((value) => Number(value ?? "50"))
    .pipe(z.number().int().min(1).max(100)),
  cursor: z.string().min(1).max(512).optional()
});

export const readReceiptParamsSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().regex(/^[A-Za-z0-9_-]{1,1500}$/)
});

export const readReceiptBodySchema = z.object({ userId: z.string().uuid() }).strict();

export const lastSeenParamsSchema = z.object({
  chatId: z.string().uuid()
});

export const lastSeenBodySchema = z
  .object({
    userId: z.string().uuid(),
    messageId: z.string().regex(/^[A-Za-z0-9_-]{1,1500}$/)
  })
  .strict();

export const userChatsParamsSchema = z.object({
  userId: z.string().uuid()
});
