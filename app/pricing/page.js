"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

export default function Pricing() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payment/plans", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "تعذر تحميل الباقات");
        if (!cancelled) setPlans(Array.isArray(json.plans) ? json.plans : []);
      } catch (e) {
        if (!cancelled) setMsg(e?.message || "تعذر تحميل الباقات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function buy(plan) {
    setBusy(plan.id);
    setMsg("");
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth");
        return;
      }
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذر إنشاء طلب الدفع");
      if (!json.approve_url) throw new Error("لم يصل رابط PayPal");
      window.location.href = json.approve_url;
    } catch (e) {
      setMsg(e?.message || "تعذر بدء الدفع");
      setBusy("");
    }
  }

  return (
    <main dir="rtl" style={{ minHeight: "100vh", padding: 30, background: "#f5f7fb", fontFamily: "Arial" }}>
      <h1>خطط Rabtchibloger</h1>
      <p>باقات واضحة لرصيد المقالات، تُقرأ مباشرة من قاعدة البيانات.</p>
      {msg && <p role="alert">{msg}</p>}
      {loading && <p>جارٍ تحميل الباقات...</p>}
      {!loading && !msg && plans.length === 0 && <p>لا توجد باقات نشطة حاليًا.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}>
        {plans.map((p) => (
          <article key={p.id} style={{ background: "#fff", padding: 24, borderRadius: 18 }}>
            <h2>{p.name}</h2>
            <h3>${Number(p.price_usd).toFixed(2)}</h3>
            <p>{p.article_credits} مقالة</p>
            <button disabled={busy === p.id} onClick={() => buy(p)}>
              {busy === p.id ? "جارٍ التحويل..." : "الدفع عبر PayPal"}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
