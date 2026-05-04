import { describe, expect, it } from "vitest";
import { escapeReportHtml } from "../domains/reporting/report-html-escape";

describe("report HTML escaping", () => {
  it("escapes unsafe HTML control characters", () => {
    expect(escapeReportHtml(`<script>"x" & 'y'</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot; &amp; &#039;y&#039;&lt;/script&gt;",
    );
  });

  it("handles nullish values as empty strings", () => {
    expect(escapeReportHtml(null)).toBe("");
    expect(escapeReportHtml(undefined)).toBe("");
  });

  it("stringifies non-string report values before escaping", () => {
    expect(escapeReportHtml(42)).toBe("42");
  });
});
