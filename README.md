# Architecture Lab 3

Результат практичної роботи 3 з архітектури ПЗ, виконаний до рівня 90 балів.

У репозиторії є checkout backend, який оформлює замовлення, працює із залишками товарів і проводить оплату. Код запускається та проходить базові тести, але містить архітектурні проблеми, які потрібно знайти й виправити під час практичної роботи.

Автор(и): Ткачук Максим

Заявлений рівень: 90 балів.

## Запуск

Потрібен Node.js 22.18 або новіший. Встановлювати залежності не потрібно.

```bash
npm test
npm run check:architecture
npm start
```

Залежності не потрібні. `npm test` перевіряє 15 тестів. `npm run check:architecture` сканує всі поточні файли в `src` та завершується з ненульовим кодом при порушенні меж модулів. `npm start` запускає demo checkout.

## Що реалізовано для рівня 75

- Платіжні стани нормалізуються в Payments; API повертає `paid`, `processing` або `failed`.
- Checkout API зберігає попередні відповіді для `paid` і `failed`.
- Orders викликає provider-neutral контракт Payments і не читає та не змінює stock storage.
- Inventory резервує всі позиції лише після перевірки наявності кожної з них.
- `calculateTotal` отримує податкові й знижкові параметри явно та не змінює кошик.
- Додані тести для status mapping, all-or-nothing reservation і чистого розрахунку.

## Додано для рівня 90

- Stripe та AcmePay реалізовані як локальні adapters із різними request, response й назвами статусів; обидва використовують стабільний контракт Payments.
- Перевірено `paid`, `processing` і `failed` для обох adapters без змін consumers.
- Додано `npm run check:architecture` для cross-module internal imports, прямих stock writes у Orders/Checkout і циклів локальних імпортів.
- Architecture-check тести створюють тимчасові source trees і перевіряють, що аналізатор знаходить кожен тип порушення.
- Заповнено `ADR-001-payments-boundary.md` з альтернативами, наслідками й вимірюваними умовами перегляду межі.

## Структура

```text
src/          код застосунку
tests/        базові функціональні тести
REVIEW.md     architecture review до змін та фактичний вплив
DECISIONS.md  журнал рішень і короткий AI review
src/payments/index.ts  provider-neutral контракт Payments
src/inventory/StockRepository.ts  all-or-nothing резервування залишків
```
