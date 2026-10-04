import test from "node:test";
import assert from "node:assert/strict";
import { InventoryService } from "../src/inventory/StockRepository.ts";
import { database, resetDatabase } from "../src/database.ts";

test.beforeEach(() => {
  resetDatabase();
});

test("reservation validates all products before changing any stock", () => {
  database.stock.set("book", { productId: "book", available: 5 });
  database.stock.set("pen", { productId: "pen", available: 1 });

  assert.throws(
    () => new InventoryService().reserve([
      { productId: "book", unitPrice: 100, quantity: 2 },
      { productId: "pen", unitPrice: 10, quantity: 2 },
    ]),
    /Insufficient stock for pen/,
  );
  assert.equal(database.stock.get("book")?.available, 5);
  assert.equal(database.stock.get("pen")?.available, 1);
});

test("reservation aggregates repeated product lines", () => {
  database.stock.set("book", { productId: "book", available: 3 });
  new InventoryService().reserve([
    { productId: "book", unitPrice: 100, quantity: 1 },
    { productId: "book", unitPrice: 100, quantity: 2 },
  ]);
  assert.equal(database.stock.get("book")?.available, 0);
});
