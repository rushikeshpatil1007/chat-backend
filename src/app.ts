import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { ApiError } from "./errors/api-error";
import { chatRouter } from "./routes/chat-routes";
import { userRouter } from "./routes/user-routes";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use((request, _response, next) => {
  console.info(`${request.method} ${request.path}`);
  next();
});

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use("/chat", chatRouter);
app.use("/user", userRouter);

app.use((_request, response) => {
  response.status(404).json({ error: { message: "Route not found" } });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: { message: error.message } });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        message: "Request validation failed",
        details: error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
      }
    });
    return;
  }

  const bodyParserErrorType =
    typeof error === "object" && error !== null && "type" in error
      ? error.type
      : undefined;

  if (bodyParserErrorType === "entity.parse.failed") {
    response.status(400).json({ error: { message: "Request body contains invalid JSON" } });
    return;
  }

  if (bodyParserErrorType === "entity.too.large") {
    response.status(413).json({ error: { message: "Request body is too large" } });
    return;
  }

  if (bodyParserErrorType === "encoding.unsupported" || bodyParserErrorType === "charset.unsupported") {
    response.status(415).json({ error: { message: "Request body encoding is not supported" } });
    return;
  }

  console.error("Unhandled request error", error instanceof Error ? error.name : "UnknownError");
  response.status(500).json({ error: { message: "Internal server error" } });
};

app.use(errorHandler);

export { app };
