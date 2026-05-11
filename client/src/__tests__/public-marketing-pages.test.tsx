import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it, vi } from "vitest";
import MarketingHome from "@/pages/marketing-home";
import Platform from "@/pages/platform";
import EvidenceLadder from "@/pages/evidence-ladder";
import UseCasesPage from "@/pages/use-cases";
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

  it("does not render derived SDG mapping details before that platform category is active", () => {
    const html = renderPublicPage("/platform", Platform);

    expect(html).toContain("What can be counted as partner-confirmed evidence");
    expect(html).toContain("Mapping Review Panel");
    expect(html).toContain("An SDG or framework tag should never stand alone.");
    expect(html).toContain("provide formal assurance");
    expect(html).not.toContain("Mapped theme");
    expect(html).not.toContain("SDG Target 7.b: Expand infrastructure and upgrade technology for sustainable energy services.");
  });

  it("keeps the landing page focused on the streamlined evidence structure", () => {
    const html = renderPublicPage("/landing", MarketingHome);

    expect(html).toContain("Claim-level evidence");
    expect(html).toContain("ESG and social-impact claims are hard to defend");
    expect(html).toContain("Create claim. Attach evidence. Confirm. Map. Preserve.");
    expect(html).toContain("Evidence Categories");
    expect(html).toContain("Self-reported");
    expect(html).toContain("Partner-confirmed");
    expect(html).toContain("Source-supported");
    expect(html).toContain("Partner-reported");
    expect(html).toContain("Thematic alignment only");
    expect(html).toContain("Request Assessment");
    expect(html).not.toContain("LinkedIn Newsletter");
  });

  it("keeps the required platform modules visible", () => {
    const html = renderPublicPage("/platform", Platform);

    [
      "Claim Register",
      "Evidence Packet Detail View",
      "Source Artifact Index",
      "Partner Confirmation Workflow",
      "Status Reconciliation",
      "Exception Log",
      "Confidence Tiers",
      "SDG / Framework Mapping",
      "Report Generator",
      "Assurance-Preparation Export",
    ].forEach((label) => {
      expect(html).toContain(label);
    });
  });

  it("keeps the newsletter on Resources only", () => {
    const homeHtml = renderPublicPage("/landing", MarketingHome);
    const platformHtml = renderPublicPage("/platform", Platform);
    const resourcesHtml = renderPublicPage("/resources", Insights);

    expect(homeHtml).not.toContain("LinkedIn Newsletter");
    expect(platformHtml).not.toContain("LinkedIn Newsletter");
    expect(resourcesHtml).toContain("LinkedIn Newsletter");
  });
});
