import test from "node:test";
import assert from "node:assert/strict";
import { PaymentsService } from "../src/payments/index.ts";
import { normalizeProviderStatus } from "../src/payments/internal/normalizeProviderStatus.ts";

test("normalizes provider states behind the Payments API", async () => {
  for (const [token, systemStatus] of [
    ["token_ok", "paid"],
    ["process_action", "processing"],
    ["fail_card", "failed"],
  ]) {
    const result = await new PaymentsService().authorize({
      orderId: "order-test",
      token,
      amount: 10,
      currency: "UAH",
    });
    assert.equal(result.status, systemStatus);
  }
});

test("unknown provider states fail safely", () => {
  assert.equal(normalizeProviderStatus("unexpected_state"), "failed");
});
