import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  tokenBlacklist,
  generateTokenPair,
  verifyRefreshToken,
  blacklistToken,
} from "../middleware/security";

describe("Security Middleware", () => {
  describe("TokenBlacklist", () => {
    beforeEach(() => {
      // Clear blacklist between tests
      (tokenBlacklist as any).blacklist.clear();
    });

    it("should add token to blacklist", () => {
      const token = "test-token-123";
      const expiresAt = Date.now() + 3600000; // 1 hour from now

      tokenBlacklist.add(token, expiresAt);

      expect(tokenBlacklist.isBlacklisted(token)).toBe(true);
    });

    it("should return false for non-blacklisted token", () => {
      expect(tokenBlacklist.isBlacklisted("unknown-token")).toBe(false);
    });

    it("should track blacklist size", () => {
      tokenBlacklist.add("token1", Date.now() + 3600000);
      tokenBlacklist.add("token2", Date.now() + 3600000);
      tokenBlacklist.add("token3", Date.now() + 3600000);

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
      expect(tokens.expiresIn).toBe(15 * 60); // 15 minutes
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

    it("should verify valid refresh token", () => {
      const tokens = generateTokenPair(testUser);
      const payload = verifyRefreshToken(tokens.refreshToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(testUser.id);
      expect(payload?.email).toBe(testUser.email);
      expect(payload?.type).toBe("refresh");
    });

    it("should reject access token as refresh token", () => {
      const tokens = generateTokenPair(testUser);
      const payload = verifyRefreshToken(tokens.accessToken);

      expect(payload).toBeNull();
    });

    it("should reject invalid token", () => {
      const payload = verifyRefreshToken("invalid-token");

      expect(payload).toBeNull();
    });

    it("should reject blacklisted refresh token", () => {
      const tokens = generateTokenPair(testUser);

      // Blacklist the refresh token
      blacklistToken(tokens.refreshToken);

      const payload = verifyRefreshToken(tokens.refreshToken);
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
      (tokenBlacklist as any).blacklist.clear();
    });

    it("should blacklist a valid JWT token", () => {
      const tokens = generateTokenPair(testUser);

      blacklistToken(tokens.accessToken);

      expect(tokenBlacklist.isBlacklisted(tokens.accessToken)).toBe(true);
    });

    it("should handle invalid token gracefully", () => {
      const invalidToken = "not-a-real-jwt";

      // Should not throw
      expect(() => blacklistToken(invalidToken)).not.toThrow();
    });
  });
});
