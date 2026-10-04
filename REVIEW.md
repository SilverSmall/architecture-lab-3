# Architecture review

| Principle | Evidence (file:line) | Practical risk | Fix |
|---|---|---|---|
| Information hiding / explicit contracts | `src/checkout/CheckoutController.ts:3,22-28` | Checkout constructs a Stripe payload, so replacing Stripe or changing its request format forces a transport-layer change. | Pass a provider-neutral payment request through a public Payments API. |
| Ownership | `src/orders/OrderService.ts:15-25` | Orders reads and writes Inventory storage directly. A later stock rule can be bypassed, and a multi-line order may leave earlier items decremented if a later line is unavailable. | Give Inventory an all-or-nothing `reserve` operation that owns validation and writes. |
| Dependency direction / low coupling | `src/payments/internal/StripeClient.ts:1-2`; `src/orders/OrderService.ts:3-5` | Payments imports Orders internals while Orders imports Payments internals, creating a cycle and making changes harder to isolate. | Keep Payments independent and let Orders depend on its provider-neutral public contract. |
| High cohesion / single source of truth | `src/orders/mapPaymentStatus.ts:1-7`, `src/reports/mapPaymentStatus.ts:1-7`, `src/notifications/mapPaymentStatus.ts:1-7` | Three copies of Stripe-specific mapping can disagree when a provider adds or changes a status. | Normalize provider responses once inside Payments and expose stable system statuses. |
| Local reasoning / deterministic calculation | `src/shared/calculateTotal.ts:1,10-22` | Total calculation depends on mutable globals, mutates cart lines, and logs as a side effect, making results harder to predict and test locally. | Pass tax and discount inputs explicitly, return the total without mutation, and log from orchestration. |

## Change impact prediction (заповнити до реалізації change request)

**Requirement:** Додати нормалізований статус `processing`, не змінюючи зовнішню поведінку Checkout API для `paid` і `failed`; ізолювати знання про payment provider у Payments.

**Expected files:** `src/payments/**`, `src/orders/OrderService.ts`, `src/checkout/CheckoutController.ts`, `src/inventory/StockRepository.ts`, `src/shared/calculateTotal.ts`, `src/config.ts`, `tests/**`, `DECISIONS.md`, `REVIEW.md`.

**Modules that should not change:** `Reports` і `Notifications` як consumers нормалізованого payment status; їхня поведінка не має залежати від конкретного provider-а.

## Actual impact (заповнити після реалізації)

**Actual files changed:**

**Difference from prediction and explanation:**
