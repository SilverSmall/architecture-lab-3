import type { PaymentRequest, PaymentResult } from "../contracts.ts";

export interface PaymentAdapter {
  authorize(request: PaymentRequest): Promise<PaymentResult>;
}
