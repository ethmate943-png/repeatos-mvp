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
      getAnalyticsDashboard: async () => ({
        summary: { totalScans: 10, uniqueCustomers: 4, rewardsTriggered: 2 },
        scansByDay: [],
        ordersByStatus: [],
        menuItemsCount: 0,
        staffCount: 0,
        creditsIssuedKobo: 0,
        creditsRedeemedKobo: 0,
        activeVouchers: 0,
        customersNewLast30Days: 0,
        repeatVisitRate: 0,
        pendingOrders: 0,
      }),
    });

    await expect(service.getSummary("biz-1")).resolves.toEqual({
      totalScans: 10,
      uniqueCustomers: 4,
      rewardsTriggered: 2,
    });
  });
});
