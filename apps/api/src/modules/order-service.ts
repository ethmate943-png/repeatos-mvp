import type {
  OrderRepository,
  PointsLedgerRepository,
  VoucherRepository,
  TenantRepository,
} from "./repository.js";
import type {
  OrderRecord,
  OrderStatus,
  PointsLedgerRecord,
  VoucherRecord,
} from "./types.js";
import { randomUUID } from "node:crypto";

import type { LoyaltyEngine } from "./loyalty-engine.js";

export class OrderService {
  constructor(
    public readonly orderRepo: OrderRepository,
    private readonly loyaltyEngine: LoyaltyEngine,
  ) {}

  async createOrder(order: Omit<OrderRecord, "id" | "createdAt" | "updatedAt">): Promise<OrderRecord> {
    return this.orderRepo.createOrder(order);
  }

  async getOrder(id: string): Promise<OrderRecord | null> {
    return this.orderRepo.getOrderById(id);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderRecord> {
    const oldOrder = await this.orderRepo.getOrderById(id);
    if (!oldOrder) throw new Error("Order not found");

    const updatedOrder = await this.orderRepo.updateOrderStatus(id, status);

    // Points are awarded when status transitions to 'accepted' ONLY
    if (oldOrder.status !== "accepted" && status === "accepted") {
      await this.loyaltyEngine.processLoyaltyForOrder(updatedOrder);
    }

    return updatedOrder;
  }

  async listOrders(businessId: string, status?: OrderStatus): Promise<OrderRecord[]> {
    return this.orderRepo.listOrdersByBusiness(businessId, status);
  }
}
