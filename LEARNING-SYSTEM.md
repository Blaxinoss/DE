# نظام التعلّم الحالي

> هذا الملف يصف السلوك الفعلي في الكود بعد تبسيط النظام إلى أربع مراحل. آخر تحديث: 10 أكتوبر 2026.

## 1. البيانات التي تملكها الكلمة

كل كلمة داخل `vocabulary` تملك حالة التعلّم والموعد الحاليين:

```text
state
next_review_at
```

أما جدول `reviews` فهو سجل تاريخي للمحاولات فقط:

```text
vocabulary_id
result
review_type
reviewed_at
```

عند تسجيل نتيجة، تنفذ `record_learning_result` تحديث الكلمة وإضافة سجل Review داخل transaction واحدة.

## 2. الفرق بين `target` و`state`

- `target`: نية المستخدم، إما فهم الكلمة فقط (`passive`) أو استخدامها (`active`).
- `state`: المستوى الحالي الذي أثبته أداء المستخدم.

المراحل الحالية:

```text
new -> learning -> recall -> active
```

| المرحلة    | معناها                                       |
| ---------- | -------------------------------------------- |
| `new`      | الكلمة لم تبدأ رحلة مراجعة ناجحة بعد         |
| `learning` | بدأ المستخدم يتعلمها، لكن استدعاءها لم يثبت  |
| `recall`   | يمكن استدعاؤها وأصبحت مؤهلة لتدريب الاستخدام |
| `active`   | ثبت استخدامها بنجاح في Activate              |

الكلمة ذات `target = passive` يمكن أن تصل إلى `recall` عن طريق Review، لكنها لا تدخل Activate، ولذلك لا تصل تلقائيًا إلى `active`. يمكن للمستخدم دائمًا تغيير الحالة يدويًا من الفورم.

## 3. تصنيف النتائج

### Review

| النتيجة   | التصنيف         |
| --------- | --------------- |
| `instant` | إيجابية وقوية   |
| `slow`    | إيجابية         |
| `hint`    | ضعيفة           |
| `wrong`   | ضعيفة وفشل كامل |

### Activate

التطبيق يحوّل تقييم Gemini إلى:

| الشرط                                       | النتيجة         |
| ------------------------------------------- | --------------- |
| الكلمة غير مستخدمة أو معناها غير صحيح       | `could_not_use` |
| الدرجة 4 أو أقل، أو grammar/collocation خطأ | `needed_help`   |
| الدرجة أقل من 8، أو الاستخدام غير طبيعي     | `effort`        |
| غير ذلك                                     | `easy`          |

| النتيجة         | التصنيف         |
| --------------- | --------------- |
| `easy`          | إيجابية وقوية   |
| `effort`        | إيجابية         |
| `needed_help`   | ضعيفة           |
| `could_not_use` | ضعيفة وفشل كامل |

## 4. قواعد الترقية

### `new -> learning`

أول Review إيجابي ينقل الكلمة مباشرة:

```text
new + instant -> learning
new + slow    -> learning
```

### `learning -> recall`

نتيجة `instant` في Review تنقل الكلمة مباشرة، بينما `slow` تبقيها في `learning`:

```text
learning + instant -> recall
learning + slow    -> learning
```

إذًا لا تكفي إجابة `slow` للنقل؛ المطلوب استدعاء سريع في مراجعة لاحقة.

### `recall -> active`

الترقية لا تحدث من Review العادي. نتيجة `easy` في Activate تنقل الكلمة مباشرة، بينما `effort` تبقيها في `recall`:

```text
recall + easy   -> active
recall + effort -> recall
```

لذلك `active` تعني أن الكلمة أثبتت استخدامًا إنتاجيًا، وليس مجرد تعرف سريع عليها.

## 5. قواعد النتائج الضعيفة والتنزيل

نتائج المساعدة لا تغيّر المرحلة:

```text
hint        -> نفس المرحلة
needed_help -> نفس المرحلة
```

أما الفشل الكامل فينزّل الكلمة فورًا مرحلة واحدة:

```text
wrong / could_not_use:
active   -> recall
recall   -> learning
learning -> learning
new      -> new
```

لا توجد عدادات أو streaks مخفية؛ كل قرار يعتمد على المرحلة والنتيجة الحاليتين فقط.

## 6. مواعيد المراجعة

الفترات الأساسية موجودة في `features/learning/rules.ts`:

| الحالة     |     المدة الأساسية |
| ---------- | -----------------: |
| `new`      | 0.25 يوم = 6 ساعات |
| `learning` |                يوم |
| `recall`   |             4 أيام |
| `active`   |           14 يومًا |

معامل النتيجة:

- `instant` أو `easy`: المدة الأساسية × `1.5`.
- `slow` أو `effort`: المدة الأساسية كما هي.
- `hint` أو `needed_help`: المدة الأساسية × `0.35`، بحد أدنى `0.2` يوم.
- `wrong` أو `could_not_use`: بعد ساعتين دائمًا.

### جدول المواعيد الكامل

| الحالة المستخدمة بعد النقل | `instant` / `easy` | `slow` / `effort` | `hint` / `needed_help` | `wrong` / `could_not_use` |
| -------------------------- | -----------------: | ----------------: | ---------------------: | ------------------------: |
| `new`                      |            9 ساعات |           6 ساعات |                 4س 48د |                    ساعتان |
| `learning`                 |             1ي 12س |               يوم |                 8س 24د |                    ساعتان |
| `recall`                   |             6 أيام |            4 أيام |              1ي 9س 36د |                    ساعتان |
| `active`                   |           21 يومًا |          14 يومًا |             4ي 21س 36د |                    ساعتان |

التطبيق يحسب الحالة الجديدة أولًا، ثم يجدول باستخدامها:

```text
result
  -> nextState
  -> state الجديدة
  -> scheduleNextReview(newState, result)
  -> RPC تحفظ الكلمة والـReview معًا
```

مرور الوقت لا ينقل الكلمة بين المراحل. هو يجعلها مستحقة فقط؛ الحالة تتغير بعد تسجيل نتيجة أو تعديلها يدويًا.

## 7. متى تظهر الكلمة في Review؟

```text
nextReviewAt === null          -> مستحقة الآن
nextReviewAt <= الوقت الحالي  -> مستحقة الآن
nextReviewAt > الوقت الحالي   -> تنتظر
```

Review تشمل الكلمات المستحقة ما عدا `recall + active target`؛ هذا النوع يُوجّه إلى Activate بدلًا من عرضه في المكانين. كلمات `recall + passive target` تظل في Review.

صفحة Review تعيد فحص الوقت كل 30 ثانية، لذلك يمكن أن تظهر كلمة حل موعدها بدون refresh يدوي.

## 8. متى تظهر الكلمة في Activate؟

تستخدم صفحة Activate دالة موحدة:

```ts
isActivationReady(word, now);
```

والشروط كلها مطلوبة:

```text
target === active
state === recall
nextReviewAt مستحق
```

لذلك Restart أو refresh لا يعيدان الكلمة قبل موعدها. نتيجة `easy` تنقلها مباشرة إلى `active`، بينما `effort` تبقيها في `recall` وتحدد لها موعدًا جديدًا.

كل تمرين يحتوي حتى 4 كلمات، ويمكن جمع 3 تمارين في طلب Gemini واحد، أي 12 كلمة كحد أقصى.

## 9. رحلة مثالية

المثال يفترض الرجوع فور حلول كل موعد:

```text
اليوم 0:
new + instant Review
-> learning
-> الموعد بعد يوم و12 ساعة

اليوم 1.5:
learning + instant Review
-> recall
-> موعد Activate بعد 6 أيام

اليوم 7.5:
recall + easy Activate
-> active
-> موعد الصيانة بعد 21 يومًا

اليوم 28.5:
active + instant Review
-> تظل active
-> الموعد التالي بعد 21 يومًا
```

## 10. ماذا يحدث بعد `active`؟

`active` ليست أرشيفًا:

| المكان     | هل تظهر؟            |
| ---------- | ------------------- |
| Vocabulary | نعم                 |
| Dashboard  | نعم، وتحسب 100%     |
| Review     | نعم عند حلول الموعد |
| Activate   | لا                  |
| Export     | نعم                 |

لو استمر الأداء قويًا:

```text
active + instant -> active، موعد جديد بعد 21 يومًا
```

ولو جاءت نتيجة `wrong` أو `could_not_use`:

```text
active -> recall
```

وعندها يمكن للكلمة العودة إلى Activate بعد حلول موعدها.

## 11. Dashboard ونسبة التقدم

| الحالة     | النسبة |
| ---------- | -----: |
| `new`      |     0% |
| `learning` |    33% |
| `recall`   |    67% |
| `active`   |   100% |

Dashboard يأخذ المتوسط لكلمات `target = active`، ويقترح الخطوة التالية بهذا الترتيب:

1. Review إذا توجد كلمات مستحقة.
2. Activate إذا توجد كلمات `recall` مستحقة وهدفها active.
3. Add vocabulary إذا لا توجد تمارين مستحقة.

## 12. Import والتوافق القديم

الـImport يقبل الحالات القديمة ويحولها:

```text
new                     -> new
recognition + passive   -> learning
slow_recall + usable    -> recall
active                  -> active
```

الـExport الجديد يخرج الحالات الأربع فقط.

## 13. أماكن القواعد في الكود

- الأنواع: [`features/learning/types.ts`](features/learning/types.ts)
- النقل والمواعيد والاستحقاق: [`features/learning/rules.ts`](features/learning/rules.ts)
- اختبارات القواعد: [`features/learning/rules.test.ts`](features/learning/rules.test.ts)
- تنظيم الحفظ وتحديث React: [`features/vocabulary/components/vocabulary-provider.tsx`](features/vocabulary/components/vocabulary-provider.tsx)
- الحفظ الذري في Supabase: [`features/vocabulary/vocabulary-repository.ts`](features/vocabulary/vocabulary-repository.ts)
- Review: [`app/review/page.tsx`](app/review/page.tsx)
- Activate: [`app/activate/page.tsx`](app/activate/page.tsx)
- Dashboard: [`app/dashboard/page.tsx`](app/dashboard/page.tsx)
- إزالة العدادات من قاعدة البيانات: [`supabase/migrations/20261010020000_remove_learning_streaks.sql`](supabase/migrations/20261010020000_remove_learning_streaks.sql)
