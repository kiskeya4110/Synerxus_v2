import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatDecimal,
  formatCurrency,
  formatPercentage,
  formatCompact,
  formatHours,
  formatRelativeTime,
  getInitials,
  truncate,
  pluralize,
  formatFileSize,
  calculatePercentage,
  formatDuration,
  formatAIU,
} from "@/lib/format-utils";

describe("Format Utils", () => {
  describe("formatNumber", () => {
    it("should format numbers with locale separators", () => {
      expect(formatNumber(1234567)).toBe("1,234,567");
      expect(formatNumber(1000)).toBe("1,000");
    });

    it("should handle edge cases", () => {
      expect(formatNumber(undefined)).toBe("0");
      expect(formatNumber(null)).toBe("0");
      expect(formatNumber(NaN)).toBe("0");
      expect(formatNumber(0)).toBe("0");
    });
  });

  describe("formatDecimal", () => {
    it("should format large numbers with K/M/B suffixes", () => {
      expect(formatDecimal(1234)).toBe("1.23K");
      expect(formatDecimal(12345)).toBe("12.3K");
      expect(formatDecimal(123456)).toBe("123K");
      expect(formatDecimal(1234567)).toBe("1.23M");
      expect(formatDecimal(1234567890)).toBe("1.23B");
    });

    it("should format small numbers with 2 decimal places", () => {
      expect(formatDecimal(99.9876)).toBe("99.99");
      expect(formatDecimal(3.14159)).toBe("3.14");
    });

    it("should format whole numbers without decimals", () => {
      expect(formatDecimal(100)).toBe("100");
      expect(formatDecimal(50)).toBe("50");
    });

    it("should handle edge cases", () => {
      expect(formatDecimal(undefined)).toBe("0.00");
      expect(formatDecimal(null)).toBe("0.00");
      expect(formatDecimal(NaN)).toBe("0.00");
    });

    it("should show 2 decimal places for values less than 1", () => {
      expect(formatDecimal(0.5)).toBe("0.50");
      expect(formatDecimal(0.05)).toBe("0.05");
      expect(formatDecimal(0.123)).toBe("0.12");
    });
  });

  describe("formatCurrency", () => {
    it("should format as USD currency by default", () => {
      expect(formatCurrency(1234.56)).toBe("$1,234.56");
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("should handle edge cases", () => {
      expect(formatCurrency(undefined)).toBe("$0");
      expect(formatCurrency(null)).toBe("$0");
      expect(formatCurrency(NaN)).toBe("$0");
    });
  });

  describe("formatPercentage", () => {
    it("should format as percentage", () => {
      expect(formatPercentage(0.1234)).toBe("12.3%");
      expect(formatPercentage(0.5)).toBe("50.0%");
      expect(formatPercentage(1)).toBe("100.0%");
    });

    it("should respect decimal parameter", () => {
      expect(formatPercentage(0.1234, 2)).toBe("12.34%");
      expect(formatPercentage(0.5, 0)).toBe("50%");
    });

    it("should handle edge cases", () => {
      expect(formatPercentage(undefined)).toBe("0%");
      expect(formatPercentage(null)).toBe("0%");
    });
  });

  describe("formatCompact", () => {
    it("should format with compact notation", () => {
      expect(formatCompact(1234567)).toBe("1.23M");
      expect(formatCompact(12345)).toBe("12.3K");
      expect(formatCompact(123456)).toBe("123K");
    });

    it("should handle small numbers", () => {
      expect(formatCompact(100)).toBe("100");
      expect(formatCompact(99.99)).toBe("99.99");
    });

    it("should show 2 decimal places for values less than 1", () => {
      expect(formatCompact(0.5)).toBe("0.50");
      expect(formatCompact(0.05)).toBe("0.05");
    });

    it("should handle edge cases", () => {
      expect(formatCompact(undefined)).toBe("0.00");
      expect(formatCompact(null)).toBe("0.00");
      expect(formatCompact(NaN)).toBe("0.00");
    });
  });

  describe("formatHours", () => {
    it("should format hours correctly", () => {
      expect(formatHours(125)).toBe("125 hours");
      expect(formatHours(1)).toBe("1 hour");
      expect(formatHours(0)).toBe("0 hours");
    });

    it("should handle undefined/null", () => {
      expect(formatHours(undefined)).toBe("0 hours");
      expect(formatHours(null)).toBe("0 hours");
    });
  });

  describe("formatRelativeTime", () => {
    it("should format recent time as just now", () => {
      expect(formatRelativeTime(new Date())).toBe("just now");
    });

    it("should format minutes ago", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo)).toBe("5 minutes ago");
    });

    it("should format hours ago", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");
    });

    it("should format days ago", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
    });

    it("should handle null/undefined", () => {
      expect(formatRelativeTime(undefined)).toBe("Unknown");
      expect(formatRelativeTime(null)).toBe("Unknown");
    });
  });

  describe("getInitials", () => {
    it("should get initials from name", () => {
      expect(getInitials("John Doe")).toBe("JD");
      expect(getInitials("Jane")).toBe("J");
      expect(getInitials("Mary Jane Watson")).toBe("MJ");
    });

    it("should handle edge cases", () => {
      expect(getInitials(undefined)).toBe("??");
      expect(getInitials(null)).toBe("??");
      expect(getInitials("")).toBe("??");
    });
  });

  describe("truncate", () => {
    it("should truncate long text", () => {
      expect(truncate("This is a long text", 10)).toBe("This is a ...");
    });

    it("should not truncate short text", () => {
      expect(truncate("Short", 10)).toBe("Short");
    });

    it("should handle edge cases", () => {
      expect(truncate(undefined, 10)).toBe("");
      expect(truncate(null, 10)).toBe("");
    });
  });

  describe("pluralize", () => {
    it("should return singular for count of 1", () => {
      expect(pluralize(1, "item")).toBe("item");
    });

    it("should return plural for counts other than 1", () => {
      expect(pluralize(0, "item")).toBe("items");
      expect(pluralize(2, "item")).toBe("items");
      expect(pluralize(100, "item")).toBe("items");
    });

    it("should use custom plural if provided", () => {
      expect(pluralize(2, "person", "people")).toBe("people");
    });
  });

  describe("formatFileSize", () => {
    it("should format file sizes", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(1024)).toBe("1.00 KB");
      expect(formatFileSize(1048576)).toBe("1.00 MB");
      expect(formatFileSize(1073741824)).toBe("1.00 GB");
    });
  });

  describe("calculatePercentage", () => {
    it("should calculate percentage", () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 3, 2)).toBe(33.33);
    });

    it("should handle zero total", () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });
  });

  describe("formatDuration", () => {
    it("should format duration in seconds", () => {
      expect(formatDuration(30)).toBe("30s");
      expect(formatDuration(65)).toBe("1m 5s");
      expect(formatDuration(3665)).toBe("1h 1m 5s");
    });

    it("should handle hours without seconds", () => {
      expect(formatDuration(3600)).toBe("1h");
      expect(formatDuration(7200)).toBe("2h");
    });
  });

  describe("formatAIU", () => {
    it("should format AIU values", () => {
      expect(formatAIU(1.23456)).toBe("1.23");
      expect(formatAIU(0)).toBe("0.00");
      expect(formatAIU(123.456789)).toBe("123.46");
    });

    it("should respect decimals parameter", () => {
      expect(formatAIU(1.23456, 4)).toBe("1.2346");
    });

    it("should handle edge cases", () => {
      expect(formatAIU(undefined)).toBe("0.00");
      expect(formatAIU(null)).toBe("0.00");
      expect(formatAIU(NaN)).toBe("0.00");
    });
  });
});
