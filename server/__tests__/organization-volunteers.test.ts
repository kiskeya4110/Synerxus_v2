import { describe, expect, it } from "vitest";
import {
  buildOrganizationVolunteerSummaries,
  collectOrganizationVolunteerIds,
} from "../utils/organization-volunteers";

describe("organization volunteer roster helpers", () => {
  it("collects volunteers from assignments, relationships, applications, activities, and org users", () => {
    const ids = collectOrganizationVolunteerIds({
      assignments: [{ volunteerId: 1 }, { volunteerId: 2 }],
      relationships: [{ volunteerId: 3 }],
      applications: [{ volunteerId: 4 }],
      activities: [{ userId: 5 }],
      users: [
        { id: 6, userType: "volunteer" },
        { id: 7, userType: "organization" },
      ],
    });

    expect(ids.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("builds volunteer summaries from activities and assignments", () => {
    const summaries = buildOrganizationVolunteerSummaries({
      volunteers: [
        { id: 10, displayName: "Al Honorat", email: "alhonorat@gmail.com", avatar: null },
      ],
      projects: [
        { id: 100, name: "Tree Planting" },
        { id: 200, name: "Beach Cleanup" },
      ],
      assignments: [
        { volunteerId: 10, projectId: 100 },
        { volunteerId: 10, projectId: 200 },
      ],
      activities: [
        { userId: 10, projectId: 100, hours: 2.5 },
        { userId: 10, projectId: 200, hours: 1.5 },
      ],
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: 10,
      displayName: "Al Honorat",
      name: "Al Honorat",
      email: "alhonorat@gmail.com",
      totalHours: 4,
      activityCount: 2,
      projectCount: 2,
      projects: ["Tree Planting", "Beach Cleanup"],
    });
  });
});
