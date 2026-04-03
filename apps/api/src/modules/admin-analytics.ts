import type { AnalyticsRepository } from "./repository.js";

export class AdminAnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getSummary(businessId: string) {
    return this.analyticsRepository.getSummary(businessId);
  }

  async getDashboard(businessId: string) {
    return this.analyticsRepository.getAnalyticsDashboard(businessId);
  }
}
