import { describe, it, expect } from "vitest";
import {
  calculateProjectAIUs,
  generateAIUCsvExport,
  generateAIUJsonExport,
  generateAIUExportFilename,
  ROLE_WEIGHTS,
  VERIFICATION_MULTIPLIERS,
  calculateLogarithmicAIU,
  calculatePureImpactAIU,
  type AIUCalculationInput,
} from "@shared/aiu-calculations";

describe("AIU Export Functions", () => {
  // Sample input data for tests
  const sampleInput: AIUCalculationInput = {
    kpiBefore: 0.40,
    kpiAfter: 0.46,
    attributionFactor: 0.22,
    volunteers: [
      {
        volunteerId: 1,
        volunteerName: "Sarah Chen",
        role: "lead",
        hours: 45,
        reliabilityStatus: "verified",
        sessionsCount: 18,
        uniqueBeneficiariesServed: 35,
      },
      {
        volunteerId: 2,
        volunteerName: "Marcus Johnson",
        role: "mentor",
        hours: 32,
        reliabilityStatus: "verified",
        sessionsCount: 14,
        uniqueBeneficiariesServed: 28,
      },
    ],
  };

  const sampleProjectData = {
    projectId: 1,
    projectName: "Education Initiative",
    sdgIndicator: "SDG 4: Quality Education",
    kpiBefore: 0.40,
    kpiAfter: 0.46,
    kpiUnit: "percentage",
    verificationStatus: "verified",
    verifier: "NGO Partner",
    verifiedAt: new Date("2024-03-01"),
    evidenceLinks: ["https://example.com/evidence1.pdf"],
    submitter: "Admin User",
    submittedAt: new Date("2024-02-15"),
    lastModifiedAt: new Date("2024-03-01"),
  };

  describe("calculateProjectAIUs", () => {
    it("should calculate correct deltaKpi", () => {
      const result = calculateProjectAIUs(sampleInput);
      expect(result.deltaKpi).toBe(0.06);
    });

    it("should calculate correct deltaSynerxus with attribution", () => {
      const result = calculateProjectAIUs(sampleInput);
      // 0.06 * 0.22 = 0.0132
      expect(result.deltaSynerxus).toBeCloseTo(0.0132, 4);
    });

    it("should include correct number of volunteer AIUs", () => {
      const result = calculateProjectAIUs(sampleInput);
      expect(result.volunteerAius.length).toBe(2);
    });

    it("should apply role weights correctly", () => {
      const result = calculateProjectAIUs(sampleInput);
      const leadVolunteer = result.volunteerAius.find(v => v.role === "lead");
      expect(leadVolunteer?.roleWeight).toBe(ROLE_WEIGHTS.lead);
    });

    it("should calculate weight percentages that sum to 100", () => {
      const result = calculateProjectAIUs(sampleInput);
      const totalPercentage = result.volunteerAius.reduce(
        (sum, v) => sum + v.weightPercentage,
        0
      );
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it("should include formula version", () => {
      const result = calculateProjectAIUs(sampleInput);
      expect(result.formulaVersion).toBe("1.0.0");
    });
  });

  describe("generateAIUCsvExport", () => {
    it("should generate valid CSV with headers", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const csv = generateAIUCsvExport(sampleProjectData, aiuResult);

      expect(csv).toContain("Project ID");
      expect(csv).toContain("Project Name");
      expect(csv).toContain("Volunteer AIU Unique");
    });

    it("should include all volunteers in CSV", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const csv = generateAIUCsvExport(sampleProjectData, aiuResult);

      expect(csv).toContain("Sarah Chen");
      expect(csv).toContain("Marcus Johnson");
    });

    it("should quote string values in CSV", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const csv = generateAIUCsvExport(sampleProjectData, aiuResult);

      expect(csv).toContain('"Education Initiative"');
      expect(csv).toContain('"SDG 4: Quality Education"');
    });

    it("should have correct number of rows (header + volunteers)", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const csv = generateAIUCsvExport(sampleProjectData, aiuResult);
      const rows = csv.split("\n");

      expect(rows.length).toBe(3); // 1 header + 2 volunteers
    });
  });

  describe("generateAIUJsonExport", () => {
    it("should generate valid JSON structure", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const json = generateAIUJsonExport(sampleProjectData, aiuResult);

      expect(json.projectId).toBe(1);
      expect(json.projectName).toBe("Education Initiative");
      expect(json.sdgIndicator).toBe("SDG 4: Quality Education");
    });

    it("should include KPI metrics", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const json = generateAIUJsonExport(sampleProjectData, aiuResult);

      expect(json.kpiMetrics.before).toBe(0.40);
      expect(json.kpiMetrics.after).toBe(0.46);
      expect(json.kpiMetrics.unit).toBe("percentage");
    });

    it("should include attribution data", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const json = generateAIUJsonExport(sampleProjectData, aiuResult);

      expect(json.attribution.factor).toBe(0.22);
      expect(json.attribution.methodology).toContain("AIU_i");
    });

    it("should include all volunteers with weights", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const json = generateAIUJsonExport(sampleProjectData, aiuResult);

      expect(json.volunteers.length).toBe(2);
      expect(json.volunteers[0].weight).toBeDefined();
      expect(json.volunteers[0].aiu).toBeDefined();
    });

    it("should include verification data", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const json = generateAIUJsonExport(sampleProjectData, aiuResult);

      expect(json.verification.status).toBe("verified");
      expect(json.verification.verifier).toBe("NGO Partner");
    });

    it("should include audit trail", () => {
      const aiuResult = calculateProjectAIUs(sampleInput);
      const json = generateAIUJsonExport(sampleProjectData, aiuResult);

      expect(json.audit.submitter).toBe("Admin User");
      expect(json.audit.version).toBe("1.0.0");
    });
  });

  describe("generateAIUExportFilename", () => {
    it("should generate CSV filename with timestamp", () => {
      const filename = generateAIUExportFilename("Education Initiative", "csv");
      expect(filename).toMatch(/^aiu_export_education_initiative_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("should generate JSON filename", () => {
      const filename = generateAIUExportFilename("Test Project", "json");
      expect(filename).toMatch(/\.json$/);
    });

    it("should sanitize project name", () => {
      const filename = generateAIUExportFilename("Test/Project*Name?", "csv", false);
      expect(filename).toBe("aiu_export_test_project_name_.csv");
    });

    it("should allow excluding timestamp", () => {
      const filename = generateAIUExportFilename("Test", "csv", false);
      expect(filename).toBe("aiu_export_test.csv");
    });
  });

  describe("ROLE_WEIGHTS", () => {
    it("should have correct weights for key roles", () => {
      expect(ROLE_WEIGHTS.executive).toBe(4.0);
      expect(ROLE_WEIGHTS.lead).toBe(1.5);
      expect(ROLE_WEIGHTS.support).toBe(1.0);
      expect(ROLE_WEIGHTS.trainee).toBe(0.5);
    });

    it("should have pro bono roles with higher weights", () => {
      expect(ROLE_WEIGHTS.pro_bono_legal).toBeGreaterThan(ROLE_WEIGHTS.support);
      expect(ROLE_WEIGHTS.pro_bono_medical).toBeGreaterThan(ROLE_WEIGHTS.support);
    });
  });

  describe("VERIFICATION_MULTIPLIERS", () => {
    it("should have correct multipliers", () => {
      expect(VERIFICATION_MULTIPLIERS.verified).toBe(1.0);
      expect(VERIFICATION_MULTIPLIERS.pending).toBe(0.7);
      expect(VERIFICATION_MULTIPLIERS.rejected).toBe(0.0);
    });
  });

  describe("calculateLogarithmicAIU", () => {
    it("should calculate AIU with logarithmic scaling", () => {
      const result = calculateLogarithmicAIU({
        livesImpacted: 100,
        outcomeType: "individual",
        role: "support",
        verificationStatus: "verified",
        hours: 50,
        projectExpectedBeneficiaries: 500,
      });

      expect(result.aiu).toBeGreaterThan(0);
      expect(result.percentOfCeiling).toBeLessThanOrEqual(100);
    });

    it("should cap AIU at maximum", () => {
      const result = calculateLogarithmicAIU({
        livesImpacted: 10000,
        outcomeType: "system",
        role: "executive",
        verificationStatus: "verified",
        hours: 500,
        projectExpectedBeneficiaries: 1000,
      });

      expect(result.aiu).toBeLessThanOrEqual(100);
    });

    it("should apply depth multipliers", () => {
      const individual = calculateLogarithmicAIU({
        livesImpacted: 100,
        outcomeType: "individual",
        role: "support",
        verificationStatus: "verified",
        hours: 50,
        projectExpectedBeneficiaries: 500,
      });

      const system = calculateLogarithmicAIU({
        livesImpacted: 100,
        outcomeType: "system",
        role: "support",
        verificationStatus: "verified",
        hours: 50,
        projectExpectedBeneficiaries: 500,
      });

      expect(system.baseScore).toBeGreaterThan(individual.baseScore);
    });
  });

  describe("calculatePureImpactAIU", () => {
    it("should focus on pure impact without gameable factors", () => {
      const result = calculatePureImpactAIU({
        livesImpacted: 50,
        outcomeType: "shared",
        verificationStatus: "verified",
        role: "mentor",
        hours: 20,
        projectExpectedBeneficiaries: 200,
      });

      expect(result.impactScore).toBeGreaterThan(0);
      expect(result.engagementFactor).toBeGreaterThan(0);
      expect(result.aiu).toBeGreaterThan(0);
    });

    it("should apply disputed verification with low multiplier", () => {
      const result = calculatePureImpactAIU({
        livesImpacted: 50,
        outcomeType: "individual",
        verificationStatus: "disputed",
        role: "support",
        hours: 20,
        projectExpectedBeneficiaries: 200,
      });

      // Disputed status should have 0.3 multiplier (per VERIFICATION_MULTIPLIERS)
      expect(result.verificationMultiplier).toBe(0.3);
      // AIU should be reduced but not zero
      expect(result.aiu).toBeGreaterThan(0);
    });

    it("should calculate consistency bonus with activity dates", () => {
      const now = new Date();
      const activityDates = [
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() - 1, 15),
        new Date(now.getFullYear(), now.getMonth() - 2, 10),
      ];

      const result = calculatePureImpactAIU({
        livesImpacted: 50,
        outcomeType: "individual",
        verificationStatus: "verified",
        role: "support",
        hours: 20,
        projectExpectedBeneficiaries: 200,
        activityDates,
      });

      expect(result.streakMonths).toBeGreaterThanOrEqual(0);
    });
  });
});
