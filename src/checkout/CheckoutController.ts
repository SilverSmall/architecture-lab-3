import { calculateTotal, type CartLine, type PricingRules } from "../shared/calculateTotal.ts";
import { OrderService } from "../orders/OrderService.ts";
import { auditLog, runtimeConfig } from "../config.ts";

export type CheckoutRequest = {
  orderId: string;
  paymentToken: string;
  currency: string;
  lines: CartLine[];
};

export class CheckoutController {
  private readonly orders: OrderService;
  private readonly pricing: PricingRules;

  constructor(
    orders = new OrderService(),
    pricing: PricingRules = {
      taxRate: runtimeConfig.taxRate,
      discountPercent: runtimeConfig.discountPercent,
    },
  ) {
    this.orders = orders;
    this.pricing = pricing;
  }

  async checkout(request: CheckoutRequest) {
    const total = calculateTotal(request.lines, this.pricing);
    auditLog.push(`total_calculated:${total}`);

    const order = await this.orders.placeOrder(
      request.orderId,
      request.lines,
      total,
      { token: request.paymentToken, currency: request.currency },
    );

    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      paymentStatus: order.paymentStatus,
    };
  }
}
