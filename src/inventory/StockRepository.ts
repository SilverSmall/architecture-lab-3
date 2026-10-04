import { database } from "../database.ts";
import type { CartLine } from "../shared/calculateTotal.ts";

/** Inventory owns stock validation and applies a reservation all at once. */
export class InventoryService {
  reserve(lines: readonly CartLine[]): void {
    const requested = new Map<string, number>();
    for (const line of lines) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new Error(`Invalid quantity for ${line.productId}`);
      }
      requested.set(
        line.productId,
        (requested.get(line.productId) ?? 0) + line.quantity,
      );
    }

    for (const [productId, quantity] of requested) {
      const row = database.stock.get(productId);
      if (!row || !Number.isFinite(row.available) || row.available < quantity) {
        throw new Error(`Insufficient stock for ${productId}`);
      }
    }

    for (const [productId, quantity] of requested) {
      const row = database.stock.get(productId)!;
      database.stock.set(productId, {
        productId,
        available: row.available - quantity,
      });
    }
  }
}
