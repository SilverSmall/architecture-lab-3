import test from "node:test";
import assert from "node:assert/strict";
import { normalizePaymentStatus } from "../src/payments/normalizePaymentStatus.ts";

test("normalizes provider payment states", () => {
  assert.equal(normalizePaymentStatus({ charge_id: "ch_1", state: "succeeded" }), "paid");
  assert.equal(normalizePaymentStatus({ charge_id: "ch_2", state: "requires_action" }), "processing");
  assert.equal(normalizePaymentStatus({ charge_id: "ch_3", state: "declined" }), "failed");
});

test("unknown provider states fail safely", () => {
  assert.equal(
    normalizePaymentStatus({ charge_id: "ch_4", state: "unknown" }),
    "failed",
  );
});
