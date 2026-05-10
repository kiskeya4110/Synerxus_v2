import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it, vi } from "vitest";
import MarketingHome from "@/pages/marketing-home";
import Platform from "@/pages/platform";
import EvidenceLadder from "@/pages/evidence-ladder";
import UseCasesPage from "@/pages/use-cases";
import ValidationFramework from "@/pages/validation-framework";
import Insights from "@/pages/insights";
import Terms from "@/pages/terms";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/hooks/use-current-user-id", () => ({
  useCurrentUserId: () => null,
}));

vi.mock("@/hooks/use-onboarding", () => ({
  useOnboarding: () => ({
    startOnboarding: vi.fn(),
    isCompleted: true,
  }),
}));

const publicPages = [
  {
    name: "landing",
    path: "/landing",
    Component: MarketingHome,
    expectedText: "Evidence alignment support for major ESG and assurance frameworks",
  },
  {
    name: "platform",
    path: "/platform",
    Component: Platform,
    expectedText: "The evidence layer behind defensible social-impact claims.",
  },
  {
    name: "evidence ladder",
    path: "/evidence-ladder",
    Component: EvidenceLadder,
    expectedText: "A maturity model for ESG claim defensibility.",
  },
  {
    name: "use cases",
    path: "/use-cases",
    Component: UseCasesPage,
    expectedText: "Use Synerxus wherever ESG claims need evidence.",
  },
  {
    name: "validation framework",
    path: "/validation-framework",
    Component: ValidationFramework,
    expectedText: "Synerxus continues only if the evidence workflow proves itself.",
  },
  {
    name: "resources",
    path: "/resources",
    Component: Insights,
    expectedText: "The Verifiable",
  },
  {
    name: "terms",
    path: "/terms",
    Component: Terms,
    expectedText: "Last updated: May 4, 2026",
  },
] as const;

function renderPublicPage(path: string, Component: React.ComponentType) {
  return renderToString(
    <Router ssrPath={path}>
      <Component />
    </Router>,
  );
}

describe("public marketing pages", () => {
  it.each(publicPages)("server-renders $name page content", ({ path, Component, expectedText }) => {
    const html = renderPublicPage(path, Component);

    expect(html).toContain(expectedText);
    expect(html).toContain("Request Assessment");
    expect(html).toContain("Synerxus");
  });
});
