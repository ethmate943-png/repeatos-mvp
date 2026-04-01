import { AdminAnalyticsService } from "./admin-analytics.js";
import { AdminUserService } from "./admin-user-service.js";
import { AntiAbuseService } from "./anti-abuse.js";
import { CheckinDomainService } from "./checkin-domain.js";
import { CustomerLedgerService } from "./customer-ledger.js";
import { LoyaltyEngine } from "./loyalty-engine.js";
import { PostgresRepository } from "./postgres-repository.js";
import { TenantSecurityService } from "./tenant-security.js";
import { WidgetService } from "./widget-service.js";
import { config } from "../config.js";
import { pool } from "./db.js";

import { OrderService } from "./order-service.js";
import { PointsService } from "./points-service.js";

const repository = new PostgresRepository(pool);

export const tenantSecurity = new TenantSecurityService(repository);
const antiAbuse = new AntiAbuseService(repository, config.scanCooldownSeconds);
export const customerLedger = new CustomerLedgerService(repository);
const loyaltyEngine = new LoyaltyEngine(repository, repository, repository, repository, repository);

export const checkinDomain = new CheckinDomainService(
  tenantSecurity,
  antiAbuse,
  customerLedger,
  loyaltyEngine,
);

export const adminAnalytics = new AdminAnalyticsService(repository);
export const adminUser = new AdminUserService(repository, repository);
export const widgetService = new WidgetService(repository);
export const orderService = new OrderService(repository, loyaltyEngine);
export const pointsService = new PointsService(repository, repository);
