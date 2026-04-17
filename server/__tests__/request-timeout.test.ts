import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestTimeout } from "../middleware/security";
import type { Request, Response, NextFunction } from "express";

function mockReqRes() {
  const req = { method: "GET", path: "/api/test" } as Request;
  const listeners: Record<string, () => void> = {};
  const res = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    on: vi.fn((event: string, cb: () => void) => { listeners[event] = cb; }),
    emit: (event: string) => listeners[event]?.(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("requestTimeout middleware", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls next() immediately", () => {
    const { req, res, next } = mockReqRes();
    requestTimeout(1000)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("sends 503 when timeout elapses before response starts", () => {
    const { req, res, next } = mockReqRes();
    requestTimeout(500)(req, res, next);
    vi.advanceTimersByTime(500);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "REQUEST_TIMEOUT" })
    );
  });

  it("does not send 503 if response already sent", () => {
    const { req, res, next } = mockReqRes();
    (res as any).headersSent = true;
    requestTimeout(500)(req, res, next);
    vi.advanceTimersByTime(500);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("clears timer on finish event", () => {
    const { req, res, next } = mockReqRes();
    requestTimeout(500)(req, res, next);
    (res as any).emit("finish");
    vi.advanceTimersByTime(500);
    expect(res.status).not.toHaveBeenCalled();
  });
});
