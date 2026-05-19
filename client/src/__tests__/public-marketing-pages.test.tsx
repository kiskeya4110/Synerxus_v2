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
import Integrations from "@/pages/integrations";

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
    expectedText: "ESG evidence your team can trace, review, and report.",
  },
  {
    name: "platform",
    path: "/platform",
    Component: Platform,
    expectedText: "The Synerxus Platform",
  },
  {
    name: "evidence ladder",
    path: "/evidence-ladder",
    Component: EvidenceLadder,
    expectedText: "A maturity model for claim defensibility. Move from unsupported to review-ready.",
  },
  {
    name: "integrations",
    path: "/integrations",
    Component: Integrations,
    expectedText: "Connect evidence work to the systems your team already uses.",
  },
  {
    name: "use cases",
    path: "/use-cases",
    Component: UseCasesPage,
    expectedText: "Built for claims that need defensible evidence.",
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
    expect(html).toContain("Synerxus");
  });

  it("does not render mapping details before that platform category is active", () => {
    const html = renderPublicPage("/platform", Platform);

    expect(html).toContain("Claim-to-Evidence Workspace");
    expect(html).toContain("Claim register");
    expect(html).toContain("Evidence packets");
    expect(html).toContain("provide formal assurance");
    expect(html).not.toContain("Mapping overview");
    expect(html).not.toContain("SDG mapping is a classification layer");
  });

  it("keeps the landing page focused on ESG evidence review", () => {
    const html = renderPublicPage("/landing", MarketingHome);

    expect(html).toContain("CORPORATE ESG REPORTING WORKFLOW");
    expect(html).toContain("ESG Evidence Workspace");
    expect(html).toContain("Attendance Log");
    expect(html).toContain("Partner Confirmation");
    expect(html).toContain("Source Documents");
    expect(html).toContain("Training Completion Record");
    expect(html).toContain("Mapping Context");
    expect(html).toContain("Traceable to source records. Built for evidence review.");
    expect(html).not.toContain("LinkedIn Newsletter");
  });

  it("keeps the platform workspace visible without duplicate step navigation", () => {
    const html = renderPublicPage("/platform", Platform);

    [
      "The Synerxus Platform",
      "Our employee volunteer program supported community workforce development activities across 8 partner organizations in 2025.",
      "Claim-to-Evidence Workspace",
      "Confirmation and Evidence Quality",
      "Mapping and Reporting Support",
      "Evidence packet",
      "Platform Boundaries",
    ].forEach((label) => {
      expect(html).toContain(label);
    });

    [
      "Step 1: Claim-to-Evidence Workspace",
      "Step 2: Confirmation and Evidence Quality",
      "Step 3: Mapping and Reporting Support",
    ].forEach((label) => {
      expect(html).not.toContain(label);
    });
  });

  it("keeps the newsletter on Resources only", () => {
    const homeHtml = renderPublicPage("/landing", MarketingHome);
    const platformHtml = renderPublicPage("/platform", Platform);
    const resourcesHtml = renderPublicPage("/resources", Insights);

    expect(homeHtml).not.toContain("LinkedIn Newsletter");
    expect(platformHtml).not.toContain("LinkedIn Newsletter");
    expect(resourcesHtml).toContain("The Verifiable");
  });

  it("shows issue numbers before Verifiable article titles", () => {
    const html = renderPublicPage("/resources", Insights).replace(/&#x27;/g, "'");

    [
      "Issue #7: Why I'm Becoming More Careful With the Word Impact",
      "Issue #6: When Distance Creates Doubt: What I've Seen Up Close",
      "Issue #5: Nature Claims Without Context; Who Pays the Price?",
      "Issue #4: California's Climate Rules: Ambitious Deadlines, Missing Infrastructure",
      "Issue #3: Impact Is Becoming a Geopolitical Asset",
      "Issue #2: Major Sustainability News This Week. Let's Apply the Verification Lens",
      "Issue #1: The Verifiable: A Founder Story",
    ].forEach((title) => {
      expect(html).toContain(title);
    });
  });

  it("shows on-site expandable Verifiable information articles", () => {
    const html = renderPublicPage("/resources", Insights);

    [
      "On-site explainers",
      "Information articles",
      "What SDG Mapping Can and Cannot Do",
      "Partner-Confirmed Is Not Independent Assurance",
      "The Evidence Ladder: A Practical Guide",
      "Why Claims Need Limitations",
      "SDG mapping is a classification layer.",
    ].forEach((text) => {
      expect(html).toContain(text);
    });
  });
});
