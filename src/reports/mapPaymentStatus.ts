import { normalizePaymentStatus } from "../payments/normalizePaymentStatus.ts";
import type { StripeResponse } from "../payments/internal/StripeClient.ts";

export const mapPaymentStatus = normalizePaymentStatus;
