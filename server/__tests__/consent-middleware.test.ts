import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("../storage", () => ({
  storage: { getUser: mockGetUser },
}));

import { requireDataConsent } from "../middleware/auth";

function mockReqRes(userId: number | undefined) {
  const req = { user: userId !== undefined ? { id: userId, email: "x@x.com", userType: "volunteer" } : undefined } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("requireDataConsent middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no authenticated user", async () => {
    const { req, res, next } = mockReqRes(undefined);
    await requireDataConsent(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user has not given consent", async () => {
    mockGetUser.mockResolvedValueOnce({ id: 1, dataConsent: false });
    const { req, res, next } = mockReqRes(1);
    await requireDataConsent(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "CONSENT_REQUIRED" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user has given consent", async () => {
    mockGetUser.mockResolvedValueOnce({ id: 1, dataConsent: true });
    const { req, res, next } = mockReqRes(1);
    await requireDataConsent(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user record not found (null dataConsent)", async () => {
    mockGetUser.mockResolvedValueOnce(null);
    const { req, res, next } = mockReqRes(1);
    await requireDataConsent(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
