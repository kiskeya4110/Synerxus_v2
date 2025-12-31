import { describe, it, expect } from "vitest";
import {
  cn,
  isValidSdg,
  filterValidSdgs,
  extractSdgsFromProjects,
  compareSdgArrays,
} from "@/lib/utils";

describe("Utils", () => {
  describe("cn (class name merger)", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
      expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
    });

    it("should merge tailwind classes correctly", () => {
      expect(cn("p-4", "p-2")).toBe("p-2"); // Later class wins
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });
  });

  describe("isValidSdg", () => {
    it("should return true for valid SDG numbers (1-17)", () => {
      expect(isValidSdg(1)).toBe(true);
      expect(isValidSdg(17)).toBe(true);
      expect(isValidSdg(10)).toBe(true);
    });

    it("should return false for invalid SDG numbers", () => {
      expect(isValidSdg(0)).toBe(false);
      expect(isValidSdg(18)).toBe(false);
      expect(isValidSdg(-1)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(isValidSdg("1")).toBe(false);
      expect(isValidSdg(null)).toBe(false);
      expect(isValidSdg(undefined)).toBe(false);
      expect(isValidSdg({})).toBe(false);
    });
  });

  describe("filterValidSdgs", () => {
    it("should filter only valid SDG numbers", () => {
      expect(filterValidSdgs([1, 5, 17, 18, 0, -1])).toEqual([1, 5, 17]);
    });

    it("should filter out non-numbers", () => {
      expect(filterValidSdgs([1, "2", null, 3, undefined])).toEqual([1, 3]);
    });

    it("should return empty array for non-array input", () => {
      expect(filterValidSdgs(null as any)).toEqual([]);
      expect(filterValidSdgs(undefined as any)).toEqual([]);
    });
  });

  describe("extractSdgsFromProjects", () => {
    it("should extract unique SDGs from projects", () => {
      const projects = [
        { sdgGoals: [1, 2, 3] },
        { sdgGoals: [2, 3, 4] },
        { sdgGoals: [5] },
      ];
      expect(extractSdgsFromProjects(projects)).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle projects without sdgGoals", () => {
      const projects = [
        { sdgGoals: [1, 2] },
        { name: "No SDGs" },
        { sdgGoals: [3] },
      ];
      expect(extractSdgsFromProjects(projects)).toEqual([1, 2, 3]);
    });

    it("should return sorted array", () => {
      const projects = [
        { sdgGoals: [17, 1, 10] },
      ];
      expect(extractSdgsFromProjects(projects)).toEqual([1, 10, 17]);
    });

    it("should return empty array for invalid input", () => {
      expect(extractSdgsFromProjects(null as any)).toEqual([]);
      expect(extractSdgsFromProjects([])).toEqual([]);
    });
  });

  describe("compareSdgArrays", () => {
    it("should identify aligned SDGs", () => {
      const result = compareSdgArrays([1, 2, 3], [2, 3, 4]);
      expect(result.aligned).toEqual([2, 3]);
    });

    it("should identify uncommitted work (committed but not contributed)", () => {
      const result = compareSdgArrays([1, 2, 3], [2, 3, 4]);
      expect(result.uncommittedWork).toEqual([1]);
    });

    it("should identify uncommitted contributions (contributed but not committed)", () => {
      const result = compareSdgArrays([1, 2, 3], [2, 3, 4]);
      expect(result.uncommittedContributions).toEqual([4]);
    });

    it("should handle empty arrays", () => {
      const result = compareSdgArrays([], [1, 2]);
      expect(result.aligned).toEqual([]);
      expect(result.uncommittedWork).toEqual([]);
      expect(result.uncommittedContributions).toEqual([1, 2]);
    });

    it("should handle fully aligned arrays", () => {
      const result = compareSdgArrays([1, 2, 3], [1, 2, 3]);
      expect(result.aligned).toEqual([1, 2, 3]);
      expect(result.uncommittedWork).toEqual([]);
      expect(result.uncommittedContributions).toEqual([]);
    });
  });
});
