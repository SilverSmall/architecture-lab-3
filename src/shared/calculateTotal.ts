export type CartLine = {
  productId: string;
  unitPrice: number;
  quantity: number;
};

export type PricingRules = {
  taxRate: number;
  discountPercent: number;
};

export function calculateTotal(
  lines: readonly CartLine[],
  rules: PricingRules,
): number {
  let subtotal = 0;

  for (const line of lines) {
    subtotal += line.unitPrice * line.quantity;
  }

  const discounted = subtotal * (1 - rules.discountPercent / 100);
  return Number((discounted * (1 + rules.taxRate)).toFixed(2));
}
