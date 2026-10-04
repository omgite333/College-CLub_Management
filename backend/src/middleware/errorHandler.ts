import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

interface HttpError extends Error {
  status?: number;
}

export function errorHandler(
  err: HttpError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues.map((i) => i.message).join("; ") });
    return;
  }
  const httpErr = err as HttpError;
  const status = httpErr.status && Number.isInteger(httpErr.status) ? httpErr.status : 500;
  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: httpErr.message || "Internal server error" });
}

export function createError(status: number, message: string): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  return err;
}
