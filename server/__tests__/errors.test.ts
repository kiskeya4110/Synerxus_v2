import { describe, it, expect, vi } from "vitest";
import { ZodError, z } from "zod";
import {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ErrorCode,
  normalizeError,
  parseId,
  parseOptionalId,
  assertExists,
  isValidId,
  success,
  failure,
  tryCatch,
} from "../utils/errors";

describe("Error Utilities", () => {
  describe("Custom Error Classes", () => {
    it("should create ApiError with correct properties", () => {
      const error = new ApiError(ErrorCode.BAD_REQUEST, "Test error", 400, { field: "test" });

      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.message).toBe("Test error");
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: "test" });
      expect(error.name).toBe("ApiError");
    });

    it("should create ValidationError with 400 status", () => {
      const error = new ValidationError("Invalid input", { field: "email" });

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: "email" });
    });

    it("should create NotFoundError with resource name", () => {
      const error = new NotFoundError("User", 123);

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.status).toBe(404);
      expect(error.message).toBe("User with ID 123 not found");
    });

    it("should create NotFoundError without ID", () => {
      const error = new NotFoundError("User");

      expect(error.message).toBe("User not found");
    });

    it("should create UnauthorizedError with default message", () => {
      const error = new UnauthorizedError();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.status).toBe(401);
      expect(error.message).toBe("Authentication required");
    });

    it("should create ForbiddenError with default message", () => {
      const error = new ForbiddenError();

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.status).toBe(403);
    });

    it("should create ConflictError", () => {
      const error = new ConflictError("Resource already exists");

      expect(error.code).toBe(ErrorCode.CONFLICT);
      expect(error.status).toBe(409);
    });

    it("should create RateLimitError with retryAfter", () => {
      const error = new RateLimitError(60);

      expect(error.code).toBe(ErrorCode.RATE_LIMITED);
      expect(error.status).toBe(429);
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it("should create DatabaseError", () => {
      const error = new DatabaseError("Connection failed");

      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.status).toBe(500);
    });
  });

  describe("normalizeError", () => {
    it("should normalize ApiError", () => {
      const error = new ValidationError("Bad input");
      const normalized = normalizeError(error);

      expect(normalized.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(normalized.status).toBe(400);
      expect(normalized.message).toBe("Bad input");
      expect(normalized.timestamp).toBeDefined();
    });

    it("should normalize ZodError", () => {
      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError | null = null;

      try {
        schema.parse({ email: "invalid" });
      } catch (err) {
        zodError = err as ZodError;
      }

      const normalized = normalizeError(zodError);

      expect(normalized.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(normalized.status).toBe(400);
      expect(normalized.details).toBeDefined();
    });

    it("should normalize plain Error", () => {
      const error = new Error("Something went wrong");
      const normalized = normalizeError(error);

      expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(normalized.status).toBe(500);
      expect(normalized.message).toBe("Something went wrong");
    });

    it("should normalize legacy error object", () => {
      const error = { status: 403, message: "Access denied" };
      const normalized = normalizeError(error);

      expect(normalized.code).toBe(ErrorCode.BAD_REQUEST);
      expect(normalized.status).toBe(403);
      expect(normalized.message).toBe("Access denied");
    });

    it("should normalize unknown error", () => {
      const normalized = normalizeError("unknown");

      expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(normalized.status).toBe(500);
    });
  });

  describe("parseId", () => {
    it("should parse valid integer", () => {
      expect(parseId(123)).toBe(123);
    });

    it("should parse valid string number", () => {
      expect(parseId("456")).toBe(456);
    });

    it("should throw for zero", () => {
      expect(() => parseId(0)).toThrow(ValidationError);
    });

    it("should throw for negative number", () => {
      expect(() => parseId(-1)).toThrow(ValidationError);
    });

    it("should throw for non-numeric string", () => {
      expect(() => parseId("abc")).toThrow(ValidationError);
    });

    it("should throw for null", () => {
      expect(() => parseId(null)).toThrow(ValidationError);
    });
  });

  describe("parseOptionalId", () => {
    it("should return undefined for null", () => {
      expect(parseOptionalId(null)).toBeUndefined();
    });

    it("should return undefined for undefined", () => {
      expect(parseOptionalId(undefined)).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      expect(parseOptionalId("")).toBeUndefined();
    });

    it("should parse valid number", () => {
      expect(parseOptionalId(123)).toBe(123);
    });

    it("should return undefined for invalid value", () => {
      expect(parseOptionalId("abc")).toBeUndefined();
    });
  });

  describe("isValidId", () => {
    it("should return true for positive integer", () => {
      expect(isValidId(1)).toBe(true);
      expect(isValidId(100)).toBe(true);
    });

    it("should return true for valid string number", () => {
      expect(isValidId("1")).toBe(true);
      expect(isValidId("100")).toBe(true);
    });

    it("should return false for zero", () => {
      expect(isValidId(0)).toBe(false);
    });

    it("should return false for negative number", () => {
      expect(isValidId(-1)).toBe(false);
    });

    it("should return false for non-integer", () => {
      expect(isValidId(1.5)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isValidId(null)).toBe(false);
    });
  });

  describe("assertExists", () => {
    it("should not throw for existing value", () => {
      const value = { id: 1, name: "test" };
      expect(() => assertExists(value, "User")).not.toThrow();
    });

    it("should throw NotFoundError for null", () => {
      expect(() => assertExists(null, "User", 123)).toThrow(NotFoundError);
    });

    it("should throw NotFoundError for undefined", () => {
      expect(() => assertExists(undefined, "User")).toThrow(NotFoundError);
    });
  });

  describe("Result Type Functions", () => {
    it("should create success result", () => {
      const result = success({ id: 1 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: 1 });
      }
    });

    it("should create failure result", () => {
      const error = normalizeError(new Error("Failed"));
      const result = failure(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Failed");
      }
    });

    it("should wrap successful promise with tryCatch", async () => {
      const promise = Promise.resolve({ id: 1 });
      const result = await tryCatch(promise);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: 1 });
      }
    });

    it("should wrap failed promise with tryCatch", async () => {
      const promise = Promise.reject(new Error("Failed"));
      const result = await tryCatch(promise);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Failed");
      }
    });
  });
});
