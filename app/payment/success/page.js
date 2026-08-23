"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const q = useSearchParams();
  const [msg, setMsg] = useState("جارٍ تأكيد الدفع...");

  useEffect(() => {
    const id = q.get("order_id");
    if (!id) {
      setMsg("لم يتم العثور على رقم الطلب.");
      return;
    }
    (async () => {
      try {
        const r = await fetch("/api/payment/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: id }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "تعذر تأكيد الدفع.");
        setMsg(j.status === "processing" ? "تم استلام الدفع وجارٍ تحديث الرصيد..." : "تم الدفع وإضافة الرصيد بنجاح.");
      } catch (e) {
        setMsg(e.message || "تعذر تأكيد الدفع.");
      }
    })();
  }, [q]);

  return (
    <main dir="rtl" style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Rabtchibloger</h1>
      <p>{msg}</p>
      <a href="/dashboard">العودة إلى لوحة التحكم</a>
    </main>
  );
}

export default function Success() {
  return (
    <Suspense fallback={<main dir="rtl" style={{ padding: 40, fontFamily: "Arial" }}><h1>Rabtchibloger</h1><p>جارٍ تحميل صفحة الدفع...</p></main>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
