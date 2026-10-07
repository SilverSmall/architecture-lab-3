# Decision log

Для кожної суттєвої зміни скопіюйте секцію нижче. Обсяг одного рішення: 80–120 слів.

## Decision N: коротка назва

**Problem:**

**Evidence:**

**Decision:**

**Why:**

**Alternative:**

**Why rejected:**

**Trade-off:**

**Verification:**

## Decision 1: Одне місце нормалізації статусів оплати

**Problem:** Orders, Reports і Notifications окремо перетворювали Stripe status на системний статус.

**Evidence:** У трьох `mapPaymentStatus.ts` повторювалися однакові гілки для `succeeded`, `requires_action` і решти відповідей.

**Decision:** Перенести нормалізацію до Payments і повертати стабільні `paid`, `processing` або `failed`.

**Why:** Provider-specific значення тепер змінюються в одному місці, тому модулі-споживачі не розходяться в інтерпретації результату.

**Alternative:** Залишити копії й синхронізувати їх вручну.

**Why rejected:** Наступне нове значення знову вимагало б узгоджених змін у кількох модулях.

**Trade-off:** Payments отримує відповідальність за mapping, а кожний provider потребуватиме адаптації до цього формату.

**Verification:** Додані unit tests для трьох відомих станів і невідомого стану; усі тести стартового набору лишаються обов'язковими.

## Decision 2: Безпечна поведінка для невідомого provider status

**Problem:** Provider може повернути status, якого система ще не розпізнає.

**Evidence:** Початковий mapping трактував усі інші відповіді як невдалі, але не мав тесту на невідоме значення.

**Decision:** Payments повертає `failed` для невідомого статусу й не передає provider-значення назовні.

**Why:** Непідтверджена оплата не стане успішною, а consumers отримують обмежений стабільний набір статусів.

**Alternative:** Повертати новий статус або кидати помилку.

**Why rejected:** Новий статус порушив би контракт consumers, а виняток обірвав би обробку замовлення.

**Trade-off:** Новий provider status потребує явного mapping-а й тесту, перш ніж отримати окрему семантику.

**Verification:** Unit test передає невідоме значення та перевіряє `failed`.

## Decision 3: Публічний Payments API та ownership залишків

**Problem:** Checkout і Orders знали деталі Stripe, а Orders напряму змінював залишки.

**Evidence:** Checkout будував Stripe payload; Orders читав `database.stock`; StripeClient викликав Orders internals.

**Decision:** Payments надає `authorize`; Inventory має all-or-nothing `reserve`, що перевіряє всі позиції перед записом.

**Why:** Кожний модуль володіє своїми деталями. Нестача одного товару не лишає часткового списання.

**Alternative:** Дозволити Orders перевіряти та записувати кожен товар напряму.

**Why rejected:** Такий код може обійти Inventory правила й змінити частину залишків до помилки.

**Trade-off:** Межі потребують adapters, а відповідальність за правила треба підтримувати в Inventory та Payments.

**Verification:** Тести підтверджують сумісну Checkout відповідь, незмінені залишки при помилці та стабільний Payments результат.

## Decision 4: Явні входи для розрахунку суми

**Problem:** `calculateTotal` читав globals, змінював кошик і записував у audit log.

**Evidence:** Функція залежала від `runtimeConfig`, додавала `lineTotal` до рядків і виконувала прихований side effect.

**Decision:** Передавати `taxRate` і `discountPercent` явно; функція повертає число, Checkout окремо журналює результат.

**Why:** Однакові аргументи дають той самий результат; unit test перевіряє його без зміни вхідних рядків.

**Alternative:** Лишити globals і скидати їх у тестах.

**Why rejected:** Залежності лишалися б прихованими, а функція й надалі мутувала б дані.

**Trade-off:** Кожний виклик передає pricing rules, зате calculation легко зрозуміти локально.

**Verification:** Unit test перевіряє дві суми та рівність cart lines до й після обчислення.

## Decision 5: Другий provider як внутрішній adapter

**Problem:** Новий provider може поширити власні payload, response й статуси в Checkout або Orders.

**Evidence:** Stripe має свої request-поля й response-стани; інший provider використовує інший формат.

**Decision:** Додати AcmePay adapter із власними request/response типами й вибором у `PaymentsService`; обидва повертають системний `PaymentResult`.

**Why:** Consumers лишають той самий `PaymentGateway.authorize`; provider-specific зміни локалізовані в Payments.

**Alternative:** Додати provider-гілки в OrderService або копіювати mapping у consumers.

**Why rejected:** Обидва варіанти розносять знання про provider за межі Payments.

**Trade-off:** Кожен adapter потребує mapping і тестів, натомість consumers мають стабільний контракт.

**Verification:** Тести перевіряють три статуси для обох adapters і однакову форму Payments API.

## Decision 6: Автоматичні architecture fitness functions

**Problem:** Майбутня зміна може порушити межі Payments, ownership Inventory або напрям залежностей.

**Evidence:** Звичайні behavior tests не виявляють internal imports, stock writes з consumers чи цикли imports.

**Decision:** Додати `npm run check:architecture`: він сканує дерево `src`, будує граф локальних imports і перевіряє internal leaks, stock writes з Orders/Checkout та cycles.

**Why:** Перевірка охоплює файли поточного дерева й показує регресію до merge.

**Alternative:** Шукати один рядок або покладатися на code review.

**Why rejected:** Один шаблон пропустить інші файли та не визначить dependency cycles.

**Trade-off:** Аналізатор розуміє статичні локальні imports, зате не потребує додаткових пакетів.

**Verification:** Тимчасові source trees перевіряють усі три violations та чистий прохід; CLI тестує ненульовий код помилки.

## AI review

- **Корисна пропозиція:** ізолювати Stripe request у Payments та захистити multi-line reservation двома проходами: перевіркою всіх позицій, потім зміною залишків.
- **Відхилена пропозиція:** винести Payments у microservice для додавання другого provider-а. Для навчального локального adapter-а це додає мережеві failure modes без потреби; межі модуля достатньо.
- **Перевірка:** зберегти функціональні тести Checkout, додати unit tests статусів, чистого розрахунку та all-or-nothing Inventory reserve; перевірити imports вручну.
