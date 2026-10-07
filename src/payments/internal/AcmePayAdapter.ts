import type { PaymentRequest, PaymentResult } from "../contracts.ts";
import type { PaymentAdapter } from "./PaymentAdapter.ts";

type AcmePayRequest = {
  merchant_reference: string;
  source_token: string;
  amount_minor: number;
  currency_code: string;
};

type AcmePayResponse = {
  transaction_reference: string;
  state: "CAPTURED" | "ACTION_REQUIRED" | "REJECTED";
};

/** Deterministic local adapter used to model a second provider. */
class AcmePayClient {
  async submit(request: AcmePayRequest): Promise<AcmePayResponse> {
    const state = request.source_token.startsWith("fail_")
      ? "REJECTED"
      : request.source_token.startsWith("process_")
        ? "ACTION_REQUIRED"
        : "CAPTURED";
    return {
      transaction_reference: `acme_${request.merchant_reference}`,
      state,
    };
  }
}

export class AcmePayAdapter implements PaymentAdapter {
  private readonly client = new AcmePayClient();

  async authorize(request: PaymentRequest): Promise<PaymentResult> {
    const response = await this.client.submit({
      merchant_reference: request.orderId,
      source_token: request.token,
      amount_minor: Math.round(request.amount * 100),
      currency_code: request.currency,
    });

    switch (response.state) {
      case "CAPTURED":
        return { status: "paid" };
      case "ACTION_REQUIRED":
        return { status: "processing" };
      case "REJECTED":
      default:
        return { status: "failed" };
    }
  }
}
