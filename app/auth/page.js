"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

const btn = { border: 0, borderRadius: 12, padding: "13px 20px", cursor: "pointer", fontWeight: 800 };

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) routeAfterAuth(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) routeAfterAuth(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function routeAfterAuth(session) {
    try {
      const response = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store"
      });
      const data = await response.json();
      router.replace(response.ok && data.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      router.replace("/dashboard");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabase();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
        if (data.session) return routeAfterAuth(data.session);
        setMessage("تم إنشاء الحساب بنجاح. افتح رسالة التأكيد في بريدك الإلكتروني، ثم سجّل الدخول.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await routeAfterAuth(data.session);
      }
    } catch (error) {
      setMessage(error.message || "حدث خطأ أثناء العملية");
    } finally {
      setBusy(false);
    }
  }

  const input = {
    width: "100%", boxSizing: "border-box", padding: "14px 15px", marginTop: 8,
    border: "1px solid #d1d5db", borderRadius: 12, fontSize: 15, outline: "none"
  };

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#fff 55%,#f5f3ff)", color: "#111827", fontFamily: "Arial,sans-serif", padding: "30px 6%" }}>
      <nav style={{ maxWidth: 1180, margin: "0 auto 35px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => router.push("/")} style={{ ...btn, background: "transparent", fontSize: 24, color: "#4f46e5" }}>
          Rabtchi<span style={{ color: "#111827" }}>Blogger</span>
        </button>
        <button onClick={() => router.push("/")} style={{ ...btn, background: "#fff", border: "1px solid #e5e7eb" }}>العودة للرئيسية</button>
      </nav>

      <section style={{ maxWidth: 1050, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 30, alignItems: "stretch" }}>
        <div style={{ padding: "45px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "inline-block", width: "fit-content", padding: "8px 14px", borderRadius: 999, background: "#e0e7ff", color: "#4338ca", fontWeight: 800, fontSize: 13 }}>منصة إنشاء المقالات بالذكاء الاصطناعي</div>
          <h1 style={{ fontSize: "clamp(38px,5vw,60px)", lineHeight: 1.12, margin: "20px 0 15px" }}>اكتب أقل،<br /><span style={{ color: "#4f46e5" }}>أنجز أكثر.</span></h1>
          <p style={{ fontSize: 18, lineHeight: 1.9, color: "#64748b", maxWidth: 520 }}>اختر المجال والموضوع واللغة والطول، ثم أنشئ مقالاتك من مساحة عمل واحدة احترافية.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 25 }}>
            {["🗂️ مجالات ومواضيع", "🌍 3 لغات", "💰 خطط واضحة", "🔐 حساب آمن"].map(x => <div key={x} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 15, fontWeight: 800 }}>{x}</div>)}
          </div>
        </div>

        <form onSubmit={submit} style={{ background: "rgba(255,255,255,.98)", border: "1px solid #e5e7eb", borderRadius: 24, padding: 32, boxShadow: "0 20px 55px rgba(15,23,42,.10)" }}>
          <div style={{ display: "flex", gap: 8, background: "#f1f5f9", padding: 5, borderRadius: 13 }}>
            <button type="button" onClick={() => { setMode("login"); setMessage(""); }} style={{ ...btn, flex: 1, background: mode === "login" ? "#fff" : "transparent", color: "#111827" }}>تسجيل الدخول</button>
            <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} style={{ ...btn, flex: 1, background: mode === "signup" ? "#fff" : "transparent", color: "#111827" }}>إنشاء حساب</button>
          </div>
          <h2 style={{ fontSize: 30, margin: "28px 0 8px" }}>{mode === "login" ? "مرحبًا بعودتك 👋" : "أنشئ حسابك 🚀"}</h2>
          <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 22 }}>{mode === "login" ? "سجّل الدخول للوصول إلى مقالاتك ولوحة التحكم." : "أنشئ حساب مستخدم جديد وابدأ برصيدك الأول."}</p>
          {mode === "signup" && <label style={{ display: "block", fontWeight: 800, marginBottom: 14 }}>الاسم الكامل<input required value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك" style={input} /></label>}
          <label style={{ display: "block", fontWeight: 800, marginBottom: 14 }}>البريد الإلكتروني<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" style={input} /></label>
          <label style={{ display: "block", fontWeight: 800, marginBottom: 14 }}>كلمة المرور<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={input} /></label>
          <button disabled={busy} type="submit" style={{ ...btn, width: "100%", marginTop: 5, background: busy ? "#9ca3af" : "#4f46e5", color: "#fff", fontSize: 16 }}>{busy ? "جارٍ التنفيذ..." : mode === "login" ? "دخول إلى حسابي" : "إنشاء حساب"}</button>
          {message && <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: mode === "signup" ? "#ecfdf5" : "#f1f5f9", color: "#334155", lineHeight: 1.8 }}>{message}</div>}
          <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, marginTop: 20 }}>ملاحظة: حساب Admin يتم تحديده من النظام ولا يتم إنشاؤه من صفحة التسجيل.</p>
        </form>
      </section>
    </main>
  );
}
