// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  sanitizeReportBody,
  sanitizeReportStyles,
  sanitizeReportHtml,
  prepareReportContent,
} from "../lib/report-sanitizer";

describe("sanitizeReportBody", () => {
  it("strips <script> tags", () => {
    const dirty = `<p>hello</p><script>alert('xss')</script>`;
    const clean = sanitizeReportBody(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert");
    expect(clean).toContain("<p>hello</p>");
  });

  it("strips inline event handlers", () => {
    const dirty = `<img src="x" onerror="alert(1)" /><div onclick="evil()">x</div>`;
    const clean = sanitizeReportBody(dirty);
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("alert");
  });

  it("strips iframe, object, embed, and form-related tags", () => {
    const dirty = `
      <iframe src="https://evil.example"></iframe>
      <object data="evil.swf"></object>
      <embed src="evil.swf" />
      <form action="https://evil"><input name="csrf" /><button>go</button></form>
    `;
    const clean = sanitizeReportBody(dirty);
    expect(clean).not.toMatch(/<iframe/i);
    expect(clean).not.toMatch(/<object/i);
    expect(clean).not.toMatch(/<embed/i);
    expect(clean).not.toMatch(/<form/i);
    expect(clean).not.toMatch(/<input/i);
    expect(clean).not.toMatch(/<button/i);
  });

  it("strips srcdoc attributes", () => {
    const dirty = `<iframe srcdoc="<script>alert(1)</script>"></iframe>`;
    const clean = sanitizeReportBody(dirty);
    expect(clean).not.toContain("srcdoc");
    expect(clean).not.toContain("alert");
  });

  it("preserves legitimate report markup (svg, tables, styles)", () => {
    const dirty = `
      <table><tr><td style="color:red">1</td></tr></table>
      <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="blue" /></svg>
    `;
    const clean = sanitizeReportBody(dirty);
    expect(clean).toContain("<table");
    expect(clean).toContain("<svg");
    expect(clean).toContain("<circle");
    expect(clean).toContain('fill="blue"');
    expect(clean).toContain('style="color:red"');
  });
});

describe("sanitizeReportStyles", () => {
  it("strips <style> wrapper tags", () => {
    const dirty = `<style>body { color: red; }</style>`;
    const clean = sanitizeReportStyles(dirty);
    expect(clean).not.toContain("<style");
    expect(clean).not.toContain("</style");
    expect(clean).toContain("body { color: red; }");
  });

  it("strips javascript: URLs", () => {
    const dirty = `a { background: javascript:alert(1); }`;
    const clean = sanitizeReportStyles(dirty);
    expect(clean).not.toMatch(/javascript\s*:/i);
  });

  it("strips data: URLs", () => {
    const dirty = `a { background: data:text/html;base64,PHNjcmlwdD4=; }`;
    const clean = sanitizeReportStyles(dirty);
    expect(clean).not.toMatch(/data\s*:/i);
  });

  it("strips IE expression() and url() values", () => {
    const dirty = `a { width: expression(alert(1)); background: url(http://evil/x); }`;
    const clean = sanitizeReportStyles(dirty);
    expect(clean).not.toMatch(/expression\s*\(/i);
    expect(clean).not.toContain("alert");
    expect(clean).not.toContain("http://evil");
  });

  it("strips @import rules", () => {
    const dirty = `@import url("https://evil.example/steal.css"); body { color: red; }`;
    const clean = sanitizeReportStyles(dirty);
    expect(clean).not.toMatch(/@import/i);
    expect(clean).not.toContain("evil.example");
  });

  it("strips CSS comments (which can hide payloads)", () => {
    const dirty = `body { /* javascript:alert(1) */ color: red; }`;
    const clean = sanitizeReportStyles(dirty);
    expect(clean).not.toContain("/*");
    expect(clean).not.toContain("javascript");
  });
});

describe("sanitizeReportHtml", () => {
  it("strips script tags from full HTML documents", () => {
    const dirty = `<html><head><script>x</script></head><body>ok</body></html>`;
    const clean = sanitizeReportHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain(">x<");
  });

  it("preserves <style> and <meta> tags (allowed in reports)", () => {
    const dirty = `<style>p{color:red}</style><meta charset="utf-8"><p>hi</p>`;
    const clean = sanitizeReportHtml(dirty);
    expect(clean).toContain("<style");
    expect(clean).toContain("<meta");
    expect(clean).toContain("<p>hi</p>");
  });
});

describe("prepareReportContent", () => {
  it("returns sanitized rawHtml, styles, and body", () => {
    const dirty = `<style>body{color:red}</style><p>hello</p><script>bad()</script>`;
    const result = prepareReportContent(dirty);
    expect(result.body).not.toContain("<script");
    expect(result.body).not.toContain("bad()");
    expect(result.styles).not.toContain("<style");
    expect(result.styles).toContain("body{color:red}");
    expect(result.rawHtml).not.toContain("bad()");
  });
});
