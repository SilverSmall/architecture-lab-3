export type PaymentStatus = "paid" | "processing" | "failed";

export type PaymentRequest = {
  orderId: string;
  token: string;
  amount: number;
  currency: string;
};

export type PaymentResult = {
  status: PaymentStatus;
};

/** Provider-neutral API used by other application modules. */
export interface PaymentGateway {
  authorize(request: PaymentRequest): Promise<PaymentResult>;
}
