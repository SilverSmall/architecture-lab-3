import test from "node:test";
import assert from "node:assert/strict";
import { PaymentsService } from "../src/payments/index.ts";
import { normalizeProviderStatus } from "../src/payments/internal/normalizeProviderStatus.ts";

test("normalizes provider states behind the Payments API", async () => {
  for (const provider of ["stripe", "acmePay"] as const) {
    for (const [token, systemStatus] of [
      ["token_ok", "paid"],
      ["process_action", "processing"],
      ["fail_card", "failed"],
    ]) {
      const result = await new PaymentsService(provider).authorize({
        orderId: "order-test",
        token,
        amount: 10,
        currency: "UAH",
      });
      assert.equal(result.status, systemStatus, `${provider} maps ${token}`);
    }
  }
});

test("unknown provider states fail safely", () => {
  assert.equal(normalizeProviderStatus("unexpected_state"), "failed");
});

test("provider selection keeps the same PaymentGateway request and response", async () => {
  const request = {
    orderId: "order-selection",
    token: "process_card",
    amount: 25,
    currency: "UAH",
  };
  const stripeResult = await new PaymentsService("stripe").authorize(request);
  const acmeResult = await new PaymentsService("acmePay").authorize(request);

  assert.deepEqual(stripeResult, { status: "processing" });
  assert.deepEqual(acmeResult, { status: "processing" });
});
