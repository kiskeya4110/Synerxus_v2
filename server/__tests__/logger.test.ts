import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Server Logger PII sanitization", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let logger: typeof import("../logger").logger;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = await import("../logger");
    logger = mod.logger;
  });

  it("redacts email addresses from error messages", () => {
    logger.error("Failed to process user@example.com request");
    const [line] = consoleErrorSpy.mock.calls[0];
    const entry = JSON.parse(line);
    expect(entry.message).not.toContain("user@example.com");
    expect(entry.message).toContain("[email]");
  });

  it("redacts phone numbers from error messages", () => {
    logger.error("User 555-123-4567 triggered an error");
    const [line] = consoleErrorSpy.mock.calls[0];
    const entry = JSON.parse(line);
    expect(entry.message).not.toContain("555-123-4567");
    expect(entry.message).toContain("[phone]");
  });

  it("redacts email from extra args", () => {
    logger.error("Auth failed", "contact admin@synerxus.com for help");
    const [line] = consoleErrorSpy.mock.calls[0];
    const entry = JSON.parse(line);
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("admin@synerxus.com");
    expect(serialized).toContain("[email]");
  });

  it("does not modify non-PII messages", () => {
    logger.error("Database connection timeout");
    const [line] = consoleErrorSpy.mock.calls[0];
    const entry = JSON.parse(line);
    expect(entry.message).toContain("Database connection timeout");
  });

  it("emits valid JSON for every log level", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("Something happened");
    const [line] = warnSpy.mock.calls[0];
    const entry = JSON.parse(line);
    expect(entry.level).toBe("warn");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
