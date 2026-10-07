import type { PaymentAdapter } from "./PaymentAdapter.ts";
import { StripeAdapter } from "./StripeAdapter.ts";
import { AcmePayAdapter } from "./AcmePayAdapter.ts";

export type PaymentProviderName = "stripe" | "acmePay";

export function createPaymentAdapter(provider: PaymentProviderName): PaymentAdapter {
  switch (provider) {
    case "stripe":
      return new StripeAdapter();
    case "acmePay":
      return new AcmePayAdapter();
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported payment provider: ${exhaustive}`);
    }
  }
}
