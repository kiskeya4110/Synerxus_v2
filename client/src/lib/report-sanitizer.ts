import DOMPurify from "dompurify";

const APPROVED_LOGO_HTML =
  '<img src="/synerxus-esg-logo.png" alt="Synerxus" class="brand-logo" />';

const REPORT_ATTRS = [
  "style",
  "class",
  "id",
  "href",
  "rel",
  "charset",
  "content",
  "name",
  "viewBox",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linejoin",
  "font-size",
  "font-family",
  "font-weight",
  "text-anchor",
  "cx",
  "cy",
  "r",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "transform",
  "opacity",
  "src",
  "alt",
  "width",
  "height",
  "loading",
];

export interface SanitizedReportContent {
  rawHtml: string;
  styles: string;
  body: string;
  sourceHtml: string;
}

function normalizeLegacySynerxusBranding(html: string): string {
  return html.replace(
    /<span class="brand-mark">S<\/span>\s*<span><strong>SYNER<\/strong><em>XUS<\/em><\/span>/gi,
    APPROVED_LOGO_HTML,
  );
}

export function sanitizeReportStyles(styles: string): string {
  return styles
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import\b[^;]*;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none");
}

export function sanitizeReportBody(body: string): string {
  return normalizeLegacySynerxusBranding(DOMPurify.sanitize(body, {
    ADD_ATTR: REPORT_ATTRS,
    ADD_TAGS: ["svg", "path", "circle", "rect", "line", "polyline", "polygon", "text"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "srcdoc"],
    FORCE_BODY: true,
  }));
}

export function sanitizeReportHtml(html: string): string {
  return normalizeLegacySynerxusBranding(DOMPurify.sanitize(html, {
    ADD_TAGS: ["style", "meta", "svg", "path", "circle", "rect", "line", "polyline", "polygon", "text"],
    ADD_ATTR: REPORT_ATTRS,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "srcdoc"],
    FORCE_BODY: true,
  }));
}

export function prepareReportContent(rawHtml: string): SanitizedReportContent {
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(rawHtml, "text/html");
  const styles = Array.from(parsedDoc.querySelectorAll("style"))
    .map((style) => style.textContent || "")
    .join("\n");

  return {
    rawHtml: sanitizeReportHtml(rawHtml),
    styles: sanitizeReportStyles(styles),
    body: sanitizeReportBody(parsedDoc.body.innerHTML),
    sourceHtml: rawHtml,
  };
}
