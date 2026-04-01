import type { WidgetRepository, RewardRepository } from "./repository.js";
import type { WidgetRecord } from "./types.js";

export class WidgetService {
  constructor(private readonly repository: WidgetRepository & RewardRepository) {}

  async createWidget(
    businessId: string,
    name: string,
    config: Record<string, any>,
  ): Promise<WidgetRecord> {
    return this.repository.createWidget({
      businessId,
      name,
      config,
    });
  }

  async getWidget(id: string): Promise<WidgetRecord | null> {
    return this.repository.getWidgetById(id);
  }

  async listWidgets(businessId: string): Promise<WidgetRecord[]> {
    return this.repository.listWidgetsByBusiness(businessId);
  }

  async listRewards(businessId: string): Promise<{ visitsRequired: number; label: string }[]> {
    return this.repository.listRewards(businessId);
  }

  getEmbedCode(widgetId: string, baseUrl: string): string {
    return `
<!-- RepeatOS Widget Begin -->
<div id="repeatos-widget"></div>
<script>
  window.REPEATOS_CONFIG = {
    widgetId: '${widgetId}',
    apiUrl: '${baseUrl}'
  };
</script>
<script src="${baseUrl}/widget.iife.js" async></script>
<!-- RepeatOS Widget End -->
    `.trim();
  }
}
