import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotal } from "../src/shared/calculateTotal.ts";

test("calculateTotal uses explicit rules and leaves cart lines unchanged", () => {
  const lines = [
    { productId: "book", unitPrice: 100, quantity: 2 },
    { productId: "pen", unitPrice: 10, quantity: 1 },
  ];
  const before = structuredClone(lines);

  assert.equal(calculateTotal(lines, { taxRate: 0.2, discountPercent: 10 }), 226.8);
  assert.deepEqual(lines, before);
  assert.equal(calculateTotal(lines, { taxRate: 0, discountPercent: 0 }), 210);
});
