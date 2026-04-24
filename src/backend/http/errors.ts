import { ZodError } from "zod";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export class ApiError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly status: number,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(userMessage);
    this.name = "ApiError";
  }
}

export function errorHandler(err: FastifyError | Error, _req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (path && !(path in fieldErrors)) fieldErrors[path] = issue.message;
    }
    return reply.code(400).send({ message: "Исправьте ошибки в форме", fieldErrors });
  }

  if (err instanceof ApiError) {
    return reply.code(err.status).send({ message: err.userMessage, fieldErrors: err.fieldErrors });
  }

  reply.log.error({ err }, "unhandled error");
  return reply.code(500).send({ message: "Внутренняя ошибка сервера" });
}
