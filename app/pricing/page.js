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

    async function loadPlans() {
      try {
        setLoading(true);
        setMsg("");
        const res = await fetch("/api/payment/plans", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "تعذر تحميل الباقات");

        const loadedPlans = Array.isArray(json.plans) ? json.plans : [];
        if (!cancelled) {
          setPlans(loadedPlans);
          if (loadedPlans.length === 0) setMsg("لا توجد باقات نشطة حاليًا.");
        }
      } catch (e) {
        if (!cancelled) {
          setPlans([]);
          setMsg(e?.message || "تعذر تحميل الباقات");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlans();
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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "تعذر إنشاء طلب الدفع");
      if (!json.approve_url) throw new Error("لم يصل رابط PayPal");
      window.location.href = json.approve_url;
    } catch (e) {
      setMsg(e?.message || "تعذر بدء الدفع");
      setBusy("");
    }
  }

  return (
    <main dir="rtl" style={{ minHeight: "100vh", padding: "40px 20px 60px", background: "linear-gradient(135deg,#f5f7fb,#eef2ff)", fontFamily: "Arial,sans-serif", color: "#111827" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 35 }}>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(30px,5vw,46px)" }}>خطط RabtchiBlogger</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 17 }}>اختر الباقة المناسبة للحصول على رصيد المقالات.</p>
        </div>

        {loading && <div style={{ background: "#fff", padding: 25, borderRadius: 18, textAlign: "center", border: "1px solid #e5e7eb" }}>جارٍ تحميل الباقات...</div>}

        {!loading && msg && plans.length === 0 && <div role="alert" style={{ background: "#fff", padding: 22, borderRadius: 18, textAlign: "center", border: "1px solid #e5e7eb", color: "#b91c1c" }}>{msg}</div>}

        {!loading && plans.length > 0 && msg && <div role="alert" style={{ marginBottom: 18, padding: 14, borderRadius: 12, background: "#fef2f2", color: "#991b1b", textAlign: "center" }}>{msg}</div>}

        {!loading && plans.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20, alignItems: "stretch" }}>
            {plans.map((plan) => {
              const price = Number(plan.price_usd ?? 0);
              const credits = Number(plan.article_credits ?? 0);
              const currency = plan.currency || "USD";
              return (
                <article key={plan.id} style={{ background: "#fff", padding: 26, borderRadius: 22, border: "1px solid #e5e7eb", boxShadow: "0 12px 35px rgba(15,23,42,.08)", display: "flex", flexDirection: "column", minHeight: 280 }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: "0 0 16px", fontSize: 25 }}>{plan.name}</h2>
                    <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, color: "#4f46e5" }}>{price.toFixed(2)} {currency}</div>
                    <p style={{ color: "#4b5563", fontSize: 17 }}>📝 {credits} مقالة</p>
                  </div>
                  <button disabled={busy === plan.id} onClick={() => buy(plan)} style={{ width: "100%", border: 0, borderRadius: 12, padding: "14px 18px", cursor: busy === plan.id ? "wait" : "pointer", fontWeight: 800, fontSize: 16, background: busy === plan.id ? "#9ca3af" : "#4f46e5", color: "#fff" }}>
                    {busy === plan.id ? "جارٍ التحويل..." : "الدفع عبر PayPal"}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button onClick={() => router.push("/")} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 12, padding: "11px 18px", cursor: "pointer", fontWeight: 700 }}>← العودة إلى إنشاء المقال</button>
        </div>
      </div>
    </main>
  );
}
