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

**Problem:** Provider може повернути новий або некоректний status, якого система ще не розпізнає.

**Evidence:** Початкова реалізація трактувала будь-яку відповідь, що не була `succeeded` або `requires_action`, як невдалу оплату, але не мала окремого тесту на невідоме значення.

**Decision:** Нормалізатор Payments повертає `failed` для невідомого статусу; значення не поширюється в публічну відповідь системи.

**Why:** Це не дозволяє непідтвердженій оплаті випадково стати успішною та зберігає обмежений набір системних статусів.

**Alternative:** Повертати новий статус або кидати помилку.

**Why rejected:** Новий статус порушив би контракт споживачів, а помилка provider-а обірвала б обробку замовлення.

**Trade-off:** Новий provider status потребує явного оновлення mapping-а й тесту, перш ніж отримати окрему семантику.

**Verification:** Unit test передає невідоме значення та перевіряє результат `failed`.

## Decision 3: Публічний Payments API та ownership залишків

**Problem:** Checkout і Orders залежали від Stripe деталей, а Orders напряму читав та змінював stock storage.

**Evidence:** `CheckoutController` будував Stripe payload, `OrderService` створював StripeClient і виконував цикли над `database.stock`; StripeClient водночас викликав Orders internals.

**Decision:** Payments надає provider-neutral `authorize`; Inventory надає all-or-nothing `reserve`, що спочатку перевіряє всі позиції й лише тоді записує зміни.

**Why:** Зовнішні модулі залежать від контракту та відповідальності власника даних. Нестача однієї позиції не залишає замовлення з частково зменшеними залишками.

**Alternative:** Лишити прямі записи й домовитися, що Orders перевіряє всі товари уважно.

**Why rejected:** Домовленість не захищає invariant від наступного споживача чи частково виконаного циклу.

**Trade-off:** Додаються межі й адаптація, але бізнес-власність треба підтримувати в Inventory та Payments.

**Verification:** Функціональні тести перевіряють незмінений Checkout response; unit tests перевіряють відсутність часткової резервації та provider-neutral результати.

## Decision 4: Явні входи для розрахунку суми

**Problem:** `calculateTotal` читав глобальні tax і discount, мутував cart lines та писав у audit log.

**Evidence:** Одна функція залежала від runtimeConfig, додавала `lineTotal` до кожного об'єкта та створювала прихований logging side effect.

**Decision:** Передавати `taxRate` і `discountPercent` явним об'єктом; розрахунок лише повертає число, а Checkout виконує audit logging окремо.

**Why:** Тепер однакові аргументи дають однаковий результат, а unit test не потребує глобальної підготовки й може перевірити, що вхідні lines не змінюються.

**Alternative:** Лишити globals, але скидати їх у кожному тесті.

**Why rejected:** Це приховує залежності й лишає мутацію та side effect у функції розрахунку.

**Trade-off:** Виклики повинні передавати pricing rules, зате calculation можна зрозуміти й перевірити локально.

**Verification:** Unit test перевіряє два набори правил, точні суми й глибоку рівність cart lines до та після виклику.

## AI review

- **Корисна пропозиція:** ізолювати Stripe request у Payments та захистити multi-line reservation двома проходами: перевіркою всіх позицій, потім зміною залишків.
- **Відхилена пропозиція:** винести Payments у microservice для додавання другого provider-а. Для навчального локального adapter-а це додає мережеві failure modes без потреби; межі модуля достатньо.
- **Перевірка:** зберегти функціональні тести Checkout, додати unit tests статусів, чистого розрахунку та all-or-nothing Inventory reserve; перевірити imports вручну.
