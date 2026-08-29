"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../lib/supabase";
import { CONTENT_CATEGORIES } from "./data/content-options";
import PricingShowcase from "./components/PricingShowcase";

const inputStyle={width:"100%",boxSizing:"border-box",padding:14,borderRadius:12,border:"1px solid #d1d5db",fontSize:15};
const btn={border:0,borderRadius:12,padding:"13px 18px",cursor:"pointer",fontWeight:800};

export default function Home(){
  const r=useRouter();
  const [session,setSession]=useState(null),[account,setAccount]=useState(null);
  const [authOpen,setAuthOpen]=useState(false),[authMode,setAuthMode]=useState("login");
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[authMsg,setAuthMsg]=useState(""),[authBusy,setAuthBusy]=useState(false);
  const [category,setCategory]=useState(CONTENT_CATEGORIES[0].id),[topic,setTopic]=useState(CONTENT_CATEGORIES[0].topics[0]),[customTopic,setCustomTopic]=useState("");
  const [title,setTitle]=useState(""),[keywords,setKeywords]=useState(""),[language,setLanguage]=useState("ar"),[length,setLength]=useState("medium");
  const [article,setArticle]=useState(null),[msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const selected=useMemo(()=>CONTENT_CATEGORIES.find(x=>x.id===category)||CONTENT_CATEGORIES[0],[category]);
  const admin=account?.role==="admin";

  useEffect(()=>{(async()=>{const s=getSupabase();const {data:{session:sess}}=await s.auth.getSession();setSession(sess||null);if(sess){const x=await fetch("/api/account",{headers:{Authorization:`Bearer ${sess.access_token}`},cache:"no-store"});const j=await x.json();if(x.ok)setAccount(j.user)}})()},[]);

  async function refreshAccount(){const s=getSupabase();const {data:{session:sess}}=await s.auth.getSession();setSession(sess||null);if(!sess){setAccount(null);return null}const x=await fetch("/api/account",{headers:{Authorization:`Bearer ${sess.access_token}`},cache:"no-store"});const j=await x.json();if(x.ok)setAccount(j.user);return j.user}
  async function submitAuth(e){e.preventDefault();setAuthBusy(true);setAuthMsg("");try{const s=getSupabase();if(authMode==="signup"){const {data,error}=await s.auth.signUp({email,password,options:{data:{full_name:name.trim()},emailRedirectTo:`${window.location.origin}/auth/callback`}});if(error)throw error;if(data.session){const u=await refreshAccount();setAuthOpen(false);r.push(u?.role==="admin"?"/admin":"/dashboard")}else setAuthMsg("تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.")}else{const {error}=await s.auth.signInWithPassword({email,password});if(error)throw error;const u=await refreshAccount();setAuthOpen(false);r.push(u?.role==="admin"?"/admin":"/dashboard")}}catch(e){setAuthMsg(e.message||"حدث خطأ")}finally{setAuthBusy(false)}}
  async function logout(){await getSupabase().auth.signOut();setSession(null);setAccount(null)}
  function requireLogin(){if(session)return true;setAuthMode("login");setAuthOpen(true);return false}
  function payload(){return {topic:customTopic.trim()||topic,title:title.trim(),keywords:keywords.trim(),category:selected.name,language,length}}
  async function generateArticle(){if(!requireLogin())return;setBusy(true);setMsg("");try{const finalTopic=customTopic.trim()||topic;if(!finalTopic)throw Error("اختر موضوع المقال أولًا");const x=await fetch("/api/generate",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify(payload())});const j=await x.json();if(!x.ok)throw Error(j.error||"تعذر إنشاء المقال");setArticle(j.article);if(!admin)await refreshAccount();setMsg("تم إنشاء المقال والصورة ودمجهما تلقائيًا وحفظهما كمسودة.")}catch(e){setMsg(e.message||"حدث خطأ")}finally{setBusy(false)}}

  return <main dir="rtl" style={{minHeight:"100vh",background:"#f7f8fc",color:"#111827",fontFamily:"Arial,sans-serif"}}>
    <nav style={{minHeight:70,background:"#fff",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:"0 6%",flexWrap:"wrap"}}>
      <button onClick={()=>r.push("/")} style={{background:"transparent",border:0,fontSize:24,fontWeight:900,cursor:"pointer",color:"#4f46e5"}}>Rabtchi<span style={{color:"#111827"}}>Blogger</span></button>
      <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>{session?<><span style={{fontWeight:800}}>{admin?"👑 Admin":"👤 حسابي"}</span><button onClick={()=>r.push(admin?"/admin":"/dashboard")} style={{...btn,background:"#111827",color:"#fff",padding:"9px 14px"}}>لوحة التحكم</button><button onClick={logout} style={{...btn,background:"#fff",border:"1px solid #d1d5db",padding:"9px 14px"}}>خروج</button></>:<><button onClick={()=>{setAuthMode("login");setAuthOpen(true)}} style={{...btn,background:"#fff",border:"1px solid #c7d2fe",color:"#4338ca"}}>تسجيل الدخول</button><button onClick={()=>{setAuthMode("signup");setAuthOpen(true)}} style={{...btn,background:"#4f46e5",color:"#fff"}}>إنشاء حساب</button></>}</div>
    </nav>

    <section style={{padding:"65px 6% 45px",textAlign:"center",background:"linear-gradient(135deg,#eef2ff,#fff 55%,#f5f3ff)"}}><div style={{maxWidth:850,margin:"auto"}}><div style={{display:"inline-block",padding:"8px 14px",borderRadius:999,background:"#e0e7ff",color:"#4338ca",fontWeight:800}}>منصة RabtchiBlogger الاحترافية</div><h1 style={{fontSize:"clamp(36px,6vw,64px)",lineHeight:1.1,margin:"20px 0"}}>من الفكرة إلى <span style={{color:"#4f46e5"}}>مقال وصورة جاهزين</span></h1><p style={{fontSize:18,color:"#4b5563",lineHeight:1.8}}>اكتب الموضوع والعنوان والكلمات المفتاحية، وسيقوم RabtchiBlogger بإنشاء المقال والصورة الأصلية تلقائيًا ودمجهما معًا.</p></div></section>

    <section id="creator" style={{padding:"45px 6% 75px"}}><div style={{maxWidth:920,margin:"auto",background:"#fff",border:"1px solid #e5e7eb",borderRadius:24,padding:30,boxShadow:"0 15px 45px rgba(15,23,42,.08)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap",alignItems:"center"}}><div><h2 style={{margin:"0 0 7px"}}>إنشاء المحتوى الذكي</h2><p style={{color:"#6b7280",margin:0}}>المقال + صورة أصلية مولدة بالذكاء الاصطناعي + فيديوهات مرتبطة، في عملية واحدة.</p></div>{session&&<div style={{padding:"10px 14px",borderRadius:12,background:admin?"#f3e8ff":"#eef2ff",fontWeight:800}}>{admin?"👑 Admin — مجاني":"🪙 رصيدك: "+(account?.article_credits??0)}</div>}</div>
      <label style={{display:"block",marginTop:22,fontWeight:800}}>المجال</label><select value={category} onChange={e=>{setCategory(e.target.value);const c=CONTENT_CATEGORIES.find(x=>x.id===e.target.value);setTopic(c?.topics?.[0]||"")}} style={{...inputStyle,marginTop:8}}>{CONTENT_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label style={{display:"block",marginTop:16,fontWeight:800}}>الموضوع</label><select value={topic} onChange={e=>setTopic(e.target.value)} style={{...inputStyle,marginTop:8}}>{selected.topics.map(t=><option key={t}>{t}</option>)}</select>
      <input value={customTopic} onChange={e=>setCustomTopic(e.target.value)} placeholder="أو اكتب موضوعًا مخصصًا..." style={{...inputStyle,marginTop:10}}/>
      <label style={{display:"block",marginTop:14,fontWeight:800}}>📝 عنوان المقال</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="اكتب عنوان المقال..." style={{...inputStyle,marginTop:8}}/>
      <label style={{display:"block",marginTop:14,fontWeight:800}}>🔑 الكلمات المفتاحية</label><input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="مثال: الذكاء الاصطناعي، SEO، كتابة المقالات" style={{...inputStyle,marginTop:8,border:"1px solid #c7d2fe"}}/><p style={{margin:"7px 0 0",fontSize:13,color:"#6b7280"}}>افصل الكلمات بفاصلة، وستُستخدم لتحسين المقال والصورة المولدة.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}><select value={language} onChange={e=>setLanguage(e.target.value)} style={inputStyle}><option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option></select><select value={length} onChange={e=>setLength(e.target.value)} style={inputStyle}><option value="short">قصير</option><option value="medium">متوسط</option><option value="long">طويل</option></select></div>
      <button disabled={busy} onClick={generateArticle} style={{...btn,width:"100%",marginTop:18,padding:16,background:busy?"#9ca3af":"#4f46e5",color:"#fff",fontSize:17}}>{busy?"⏳ جارٍ إنشاء المقال والصورة...":"✨ إنشاء المقال والصورة تلقائيًا"}</button>
      {msg&&<div style={{marginTop:16,padding:14,borderRadius:12,background:"#f3f4f6",lineHeight:1.7}}>{msg}</div>}
      {article&&<article style={{marginTop:28,borderTop:"1px solid #eee",paddingTop:24,lineHeight:1.9}}><h2>{article.title}</h2><div dangerouslySetInnerHTML={{__html:article.content}}/><button onClick={()=>r.push("/articles")} style={{...btn,marginTop:16,background:"#111827",color:"#fff"}}>مقالاتي والتصدير</button></article>}
    </div></section>

    <PricingShowcase admin={admin}/>

    {authOpen&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.55)",display:"grid",placeItems:"center",padding:18,zIndex:50}}><form onSubmit={submitAuth} style={{width:"min(430px,100%)",background:"#fff",padding:26,borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{margin:0}}>{authMode==="login"?"تسجيل الدخول":"إنشاء حساب"}</h2><button type="button" onClick={()=>setAuthOpen(false)} style={{background:"transparent",border:0,fontSize:22,cursor:"pointer"}}>×</button></div>{authMode==="signup"&&<input required value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم الكامل" style={{...inputStyle,marginTop:18}}/>}<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني" style={{...inputStyle,marginTop:12}}/><input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور" style={{...inputStyle,marginTop:12}}/><button disabled={authBusy} style={{...btn,width:"100%",marginTop:16,background:"#4f46e5",color:"#fff"}}>{authBusy?"جارٍ المعالجة...":authMode==="login"?"دخول":"إنشاء الحساب"}</button>{authMsg&&<p style={{padding:12,background:"#f3f4f6",borderRadius:10,lineHeight:1.6}}>{authMsg}</p>}<button type="button" onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMsg("")}} style={{marginTop:14,background:"transparent",border:0,color:"#4f46e5",cursor:"pointer"}}>{authMode==="login"?"ليس لديك حساب؟ إنشاء حساب":"لديك حساب؟ تسجيل الدخول"}</button></form></div>}
  </main>
}
