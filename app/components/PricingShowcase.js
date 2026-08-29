"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const planVisuals = {
  "أساسي": { icon: "🌱", badge: "للبداية", description: "ابدأ بسهولة وأنشئ مقالاتك الأولى بجودة احترافية." },
  "احترافي": { icon: "🚀", badge: "الأكثر شعبية", description: "الخيار المتوازن لصناع المحتوى والمدونات النشطة." },
  "مميز": { icon: "👑", badge: "للمحترفين", description: "رصيد كبير لمن يريد إنتاج محتوى مستمر على نطاق واسع." },
};

export default function PricingShowcase({ admin = false }) {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/payment/plans", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json.plans) ? json.plans : [];
        if (!cancelled) setPlans(rows);
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (admin || (!loading && plans.length === 0)) return null;

  return (
    <section id="pricing" dir="rtl" style={{ padding: "25px 6% 85px", position: "relative", overflow: "hidden", background: "linear-gradient(180deg,#f7f8fc 0%,#eef2ff 100%)" }}>
      <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "rgba(99,102,241,.10)", top: -100, right: -80 }} />
      <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "rgba(168,85,247,.09)", bottom: -100, left: -70 }} />
      <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <span style={{ display: "inline-block", padding: "8px 15px", borderRadius: 999, background: "#e0e7ff", color: "#4338ca", fontWeight: 900, fontSize: 13 }}>✨ اختر ما يناسبك</span>
          <h2 style={{ margin: "14px 0 10px", fontSize: "clamp(30px,5vw,48px)", lineHeight: 1.15 }}>خطط بسيطة لصناعة محتوى <span style={{ color: "#4f46e5" }}>أكثر</span></h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 17, lineHeight: 1.8 }}>ادفع فقط عندما تحتاج إلى رصيد إضافي، واستمتع بتجربة كتابة سهلة وسريعة.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 35, background: "rgba(255,255,255,.75)", borderRadius: 22 }}>جارٍ تحميل الباقات...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 20, alignItems: "stretch" }}>
            {plans.map((plan) => {
              const visual = planVisuals[plan.name] || { icon: "⭐", badge: "خطة", description: "رصيد مرن لإنشاء المزيد من المقالات." };
              const price = Number(plan.price_usd ?? 0);
              const credits = Number(plan.article_credits ?? 0);
              return (
                <article key={plan.id} style={{ background: "rgba(255,255,255,.96)", border: plan.name === "احترافي" ? "2px solid #6366f1" : "1px solid #e5e7eb", borderRadius: 26, padding: 26, boxShadow: plan.name === "احترافي" ? "0 20px 55px rgba(79,70,229,.18)" : "0 15px 40px rgba(15,23,42,.07)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                  {plan.name === "احترافي" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "7px 10px", textAlign: "center", background: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 900 }}>⭐ الأكثر شعبية</div>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: plan.name === "احترافي" ? 20 : 0 }}>
                    <div style={{ width: 58, height: 58, borderRadius: 18, display: "grid", placeItems: "center", fontSize: 30, background: "linear-gradient(135deg,#eef2ff,#f5f3ff)" }}>{visual.icon}</div>
                    <span style={{ padding: "7px 11px", borderRadius: 999, background: "#f3f4f6", color: "#4b5563", fontSize: 12, fontWeight: 800 }}>{visual.badge}</span>
                  </div>
                  <h3 style={{ fontSize: 25, margin: "20px 0 8px" }}>{plan.name}</h3>
                  <p style={{ minHeight: 52, margin: 0, color: "#6b7280", lineHeight: 1.7 }}>{visual.description}</p>
                  <div style={{ margin: "22px 0 6px", fontSize: 38, fontWeight: 950, color: "#4f46e5" }}>{price.toFixed(2)} <small style={{ fontSize: 15, color: "#6b7280" }}>USD</small></div>
                  <div style={{ padding: "12px 14px", borderRadius: 14, background: "#f8fafc", color: "#374151", fontWeight: 800, marginBottom: 20 }}>📝 {credits} مقالة</div>
                  <button onClick={() => router.push("/pricing")} style={{ marginTop: "auto", width: "100%", border: 0, borderRadius: 14, padding: "14px 18px", cursor: "pointer", fontWeight: 900, fontSize: 15, background: plan.name === "احترافي" ? "#4f46e5" : "#111827", color: "#fff" }}>اختيار هذه الباقة →</button>
                </article>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 25, textAlign: "center", color: "#6b7280", fontSize: 13 }}>🔒 الدفع يتم عبر PayPal • لا تظهر هذه الخطط لحساب الأدمن</div>
      </div>
    </section>
  );
}
