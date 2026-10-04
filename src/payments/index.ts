import { StripeClient } from "./internal/StripeClient.ts";
import { normalizeProviderStatus } from "./internal/normalizeProviderStatus.ts";

export type PaymentStatus = "paid" | "processing" | "failed";

export type PaymentRequest = {
  orderId: string;
  token: string;
  amount: number;
  currency: string;
};

export type PaymentResult = {
  status: PaymentStatus;
};

/** Provider-neutral API used by other application modules. */
export interface PaymentGateway {
  authorize(request: PaymentRequest): Promise<PaymentResult>;
}

export class PaymentsService implements PaymentGateway {
  private readonly stripe = new StripeClient();

  async authorize(request: PaymentRequest): Promise<PaymentResult> {
    const response = await this.stripe.createCharge({
      id: request.token,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      metadata: { orderId: request.orderId },
    });

    return { status: normalizeProviderStatus(response.state) };
  }
}
