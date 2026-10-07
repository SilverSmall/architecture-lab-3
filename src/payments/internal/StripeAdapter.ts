import type { PaymentRequest, PaymentResult } from "../contracts.ts";
import { StripeClient } from "./StripeClient.ts";
import { normalizeProviderStatus } from "./normalizeProviderStatus.ts";
import type { PaymentAdapter } from "./PaymentAdapter.ts";

export class StripeAdapter implements PaymentAdapter {
  private readonly client = new StripeClient();

  async authorize(request: PaymentRequest): Promise<PaymentResult> {
    const response = await this.client.createCharge({
      id: request.token,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      metadata: { orderId: request.orderId },
    });
    return { status: normalizeProviderStatus(response.state) };
  }
}
