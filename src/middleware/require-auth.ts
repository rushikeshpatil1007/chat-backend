import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ApiError } from "../errors/api-error";

const userIdSchema = z.string().uuid();
const minimumSecretBytes = 32;

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    next(new ApiError(401, "A bearer token is required"));
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    Buffer.byteLength(secret, "utf8") < minimumSecretBytes ||
    secret.includes("replace-with")
  ) {
    next(new ApiError(500, "Authentication is not configured"));
    return;
  }

  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
    if (typeof payload === "string") {
      next(new ApiError(401, "The bearer token must contain a UUID subject and expiry"));
      return;
    }

    const userId = userIdSchema.safeParse(payload.sub);
    const expiresAt = payload.exp;

    if (!userId.success || typeof expiresAt !== "number") {
      next(new ApiError(401, "The bearer token must contain a UUID subject and expiry"));
      return;
    }

    request.authUserId = userId.data.toLowerCase();
    next();
  } catch {
    next(new ApiError(401, "The bearer token is invalid or expired"));
  }
};
