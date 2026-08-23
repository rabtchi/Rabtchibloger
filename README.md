# Rabtchibloger

منصة Next.js لإنشاء وإدارة وتصدير المقالات بالذكاء الاصطناعي، مع Supabase وPayPal.

## التشغيل المحلي

```bash
npm install
npm run build
npm start
```

## متغيرات البيئة

راجع `.env.example` وأضف القيم في Vercel. لا تضع المفاتيح السرية داخل الكود أو GitHub.

المتغيرات المطلوبة:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYPAL_ENV`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (اختياري، الافتراضي `gpt-4o-mini`)

## Supabase

نفّذ `supabase/schema.sql` في SQL Editor قبل استخدام الحسابات والدفع.

## Vercel

المشروع لا يحتاج `vercel.json`. ارفع المستودع كما هو، واختر Next.js. تأكد أن Root Directory هو جذر المستودع وليس مجلدًا داخليًا.

## PayPal

ابدأ بـ `PAYPAL_ENV=sandbox` للاختبار، ثم انتقل إلى `live` بعد اختبار عملية الدفع كاملة.

## الأمان

`SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_SECRET`, و`OPENAI_API_KEY` متغيرات server-side فقط ولا يجب كشفها للمتصفح.
