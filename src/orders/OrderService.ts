import { database } from "../database.ts";
import type { CartLine } from "../shared/calculateTotal.ts";
import { InventoryService } from "../inventory/StockRepository.ts";
import { PaymentsService, type PaymentGateway } from "../payments/index.ts";

export class OrderService {
  private readonly inventory: InventoryService;
  private readonly payments: PaymentGateway;

  constructor(
    inventory = new InventoryService(),
    payments: PaymentGateway = new PaymentsService(),
  ) {
    this.inventory = inventory;
    this.payments = payments;
  }

  async placeOrder(
    orderId: string,
    lines: readonly CartLine[],
    total: number,
    payment: { token: string; currency: string },
  ) {
    this.inventory.reserve(lines);
    database.orders.set(orderId, { id: orderId, status: "created", total });
    const paymentResult = await this.payments.authorize({
      orderId,
      token: payment.token,
      amount: total,
      currency: payment.currency,
    });
    const order = database.orders.get(orderId)!;
    order.paymentStatus = paymentResult.status;
    order.status = paymentResult.status === "paid" ? "confirmed" : "payment_pending";
    return { ...order };
  }
}
