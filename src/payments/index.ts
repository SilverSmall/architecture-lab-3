import type { PaymentGateway, PaymentRequest, PaymentResult } from "./contracts.ts";
import type { PaymentAdapter } from "./internal/PaymentAdapter.ts";
import { createPaymentAdapter, type PaymentProviderName } from "./internal/createPaymentAdapter.ts";

export type { PaymentGateway, PaymentRequest, PaymentResult, PaymentStatus } from "./contracts.ts";

export class PaymentsService implements PaymentGateway {
  private readonly adapter: PaymentAdapter;

  constructor(provider: PaymentProviderName = "stripe") {
    this.adapter = createPaymentAdapter(provider);
  }

  async authorize(request: PaymentRequest): Promise<PaymentResult> {
    return this.adapter.authorize(request);
  }
}
