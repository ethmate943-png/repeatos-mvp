import { describe, expect, it } from "vitest";
import { AdminAnalyticsService } from "./admin-analytics.js";

describe("AdminAnalyticsService", () => {
  it("returns analytics summary for business", async () => {
    const service = new AdminAnalyticsService({
      getSummary: async () => ({
        totalScans: 10,
        uniqueCustomers: 4,
        rewardsTriggered: 2,
      }),
    });

    await expect(service.getSummary("biz-1")).resolves.toEqual({
      totalScans: 10,
      uniqueCustomers: 4,
      rewardsTriggered: 2,
    });
  });
});
