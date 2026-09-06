export const ERROR_CODES = [
  "ALREADY_CLAIMED",
  "NOT_FOUND",
  "INVALID_TRANSITION",
  "TOKEN_REVOKED",
  "TOKEN_MISSING",
  "UNAUTHORIZED",
  /** Token authenticated, but not allowed to change the workspace config. */
  "PERMISSION_DENIED",
  "INVALID_ARGUMENT",
  "REOPEN_COMMENT_REQUIRED",
  "HARNESS_UNAVAILABLE",
  "TASK_NOT_CLAIMABLE",
  "VALIDATION_HUMAN_ONLY",
  "DESVALIDATE_HUMAN_ONLY",
  "MISSION_NOT_ACTIVE",
  "MISSION_ATTEMPT_ALREADY_OPEN",
  "MISSION_ATTEMPT_NOT_FOUND",
  "INVALID_SEQUENCE",
  "SESSION_REUSED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class McpCoreError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "McpCoreError";
    this.code = code;
    this.details = details;
  }
}

export type Result<T, E = McpCoreError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err(
  code: ErrorCode,
  message: string,
  details?: unknown,
): Result<never> {
  return { ok: false, error: new McpCoreError(code, message, details) };
}

export function isMcpCoreError(value: unknown): value is McpCoreError {
  return value instanceof McpCoreError;
}
