import { describe, it, expect, vi, beforeEach } from "vitest";

// Force TokenBlacklist to always use its in-memory fallback Map by making Redis throw
vi.mock("../redis", () => ({
  getRedisClient: vi.fn().mockRejectedValue(new Error("Redis not available in tests")),
}));

import {
  tokenBlacklist,
  generateTokenPair,
  verifyRefreshToken,
  blacklistToken,
} from "../middleware/security";

describe("Security Middleware", () => {
  describe("TokenBlacklist", () => {
    beforeEach(() => {
      (tokenBlacklist as any).fallback.clear();
    });

    it("should add token to blacklist", async () => {
      const token = "test-token-123";
      const expiresAt = Date.now() + 3600000;

      await tokenBlacklist.add(token, expiresAt);

      expect(await tokenBlacklist.isBlacklisted(token)).toBe(true);
    });

    it("should return false for non-blacklisted token", async () => {
      expect(await tokenBlacklist.isBlacklisted("unknown-token")).toBe(false);
    });

    it("should track blacklist size", async () => {
      await tokenBlacklist.add("token1", Date.now() + 3600000);
      await tokenBlacklist.add("token2", Date.now() + 3600000);
      await tokenBlacklist.add("token3", Date.now() + 3600000);

      expect(tokenBlacklist.size()).toBe(3);
    });
  });

  describe("generateTokenPair", () => {
    const testUser = {
      id: 1,
      email: "test@example.com",
      userType: "volunteer",
      organizationId: null,
    };

    it("should generate access and refresh tokens", () => {
      const tokens = generateTokenPair(testUser);

      expect(tokens).toHaveProperty("accessToken");
      expect(tokens).toHaveProperty("refreshToken");
      expect(tokens).toHaveProperty("expiresIn");
      expect(typeof tokens.accessToken).toBe("string");
      expect(typeof tokens.refreshToken).toBe("string");
      expect(tokens.expiresIn).toBe(30 * 60);
    });

    it("should generate different access and refresh tokens", () => {
      const tokens = generateTokenPair(testUser);

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe("verifyRefreshToken", () => {
    const testUser = {
      id: 1,
      email: "test@example.com",
      userType: "volunteer",
      organizationId: null,
    };

    it("should verify valid refresh token", async () => {
      const tokens = generateTokenPair(testUser);
      const payload = await verifyRefreshToken(tokens.refreshToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(testUser.id);
      expect(payload?.email).toBe(testUser.email);
      expect(payload?.type).toBe("refresh");
    });

    it("should reject access token as refresh token", async () => {
      const tokens = generateTokenPair(testUser);
      const payload = await verifyRefreshToken(tokens.accessToken);

      expect(payload).toBeNull();
    });

    it("should reject invalid token", async () => {
      const payload = await verifyRefreshToken("invalid-token");

      expect(payload).toBeNull();
    });

    it("should reject blacklisted refresh token", async () => {
      const tokens = generateTokenPair(testUser);

      await blacklistToken(tokens.refreshToken);

      const payload = await verifyRefreshToken(tokens.refreshToken);
      expect(payload).toBeNull();
    });
  });

  describe("blacklistToken", () => {
    const testUser = {
      id: 1,
      email: "test@example.com",
      userType: "volunteer",
      organizationId: null,
    };

    beforeEach(() => {
      (tokenBlacklist as any).fallback.clear();
    });

    it("should blacklist a valid JWT token", async () => {
      const tokens = generateTokenPair(testUser);

      await blacklistToken(tokens.accessToken);

      expect(await tokenBlacklist.isBlacklisted(tokens.accessToken)).toBe(true);
    });

    it("should handle invalid token gracefully", async () => {
      const invalidToken = "not-a-real-jwt";

      await expect(blacklistToken(invalidToken)).resolves.not.toThrow();
    });
  });
});
