"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

const btn={border:0,borderRadius:12,padding:"12px 18px",cursor:"pointer",fontWeight:800};

export default function Admin(){
 const r=useRouter();
 const [ready,setReady]=useState(false),[allowed,setAllowed]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [user,setUser]=useState(null),[users,setUsers]=useState([]),[loadingUsers,setLoadingUsers]=useState(false);

 async function load(){
  try{
   setError("");
   const s=getSupabase(),{data:{session}}=await s.auth.getSession();
   if(!session){setAllowed(false);return}
   const a=await fetch("/api/account",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
   const j=await a.json();
   if(!a.ok||j.user?.role!=="admin") throw Error("هذا الحساب ليس Admin");
   setUser(j.user);setAllowed(true);
   setLoadingUsers(true);
   const x=await fetch("/api/admin",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
   if(x.ok){const z=await x.json();setUsers(z.users||[])}
  }catch(e){setAllowed(false);setError(e.message||"تعذر التحقق من صلاحيات الإدارة")}
  finally{setLoadingUsers(false);setReady(true)}
 }
 useEffect(()=>{load()},[]);

 async function enter(e){e.preventDefault();setBusy(true);setError("");try{const s=getSupabase(),{error}=await s.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;await load()}catch(x){setError(x.message)}finally{setBusy(false)}}
 async function logout(){await getSupabase().auth.signOut();setAllowed(false);setUser(null);setUsers([]);setEmail("");setPassword("")}

 if(!ready)return <main dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Arial"}}>جارٍ فتح لوحة الإدارة...</main>;
 if(!allowed)return <main dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"#f6f8fb",fontFamily:"Arial"}}><form onSubmit={enter} style={{width:"min(420px,100%)",background:"#fff",padding:30,borderRadius:22}}><h1>🔐 لوحة الإدارة</h1><p>هذه المنطقة خاصة بالمسؤول فقط.</p><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني" style={{width:"100%",boxSizing:"border-box",padding:14,margin:"8px 0",borderRadius:10,border:"1px solid #ddd"}}/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور" style={{width:"100%",boxSizing:"border-box",padding:14,margin:"8px 0 14px",borderRadius:10,border:"1px solid #ddd"}}/><button disabled={busy} style={{...btn,width:"100%",background:"#4f46e5",color:"#fff"}}>{busy?"جارٍ الدخول...":"دخول Admin"}</button>{error&&<p style={{color:"#b91c1c"}}>{error}</p>}</form></main>;

 return <main dir="rtl" style={{minHeight:"100vh",padding:24,background:"#f6f8fb",fontFamily:"Arial"}}><div style={{maxWidth:1100,margin:"auto"}}>
  <header style={{background:"#fff",padding:24,borderRadius:20,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h1 style={{margin:0}}>👑 لوحة الإدارة</h1><p style={{color:"#64748b"}}>مرحبًا {user?.full_name||user?.email} — لديك أدوات إنشاء مجانية وغير محدودة.</p></div><button onClick={logout} style={btn}>خروج</button></header>

  <section style={{marginTop:18,background:"linear-gradient(135deg,#4f46e5,#111827)",padding:28,borderRadius:20,color:"#fff"}}><h2 style={{marginTop:0}}>✍️🖼️ استوديو إنشاء المقالات والصور</h2><p>استخدم نفس نظام المستخدمين، لكن بصلاحيات Admin وبدون خصم أي رصيد.</p><button onClick={()=>r.push("/admin/create")} style={{...btn,background:"#fff",color:"#111827",fontSize:16}}>🚀 فتح استوديو Admin</button></section>

  <section style={{marginTop:18,background:"#fff",padding:24,borderRadius:20}}><h2>👥 المستخدمون</h2><p style={{color:"#64748b"}}>{loadingUsers?"جارٍ التحميل...":`عدد الحسابات: ${users.length}`}</p>{users.slice(0,10).map(x=><div key={x.id} style={{padding:"10px 0",borderBottom:"1px solid #eee"}}>{x.full_name||x.email}</div>)}</section>
 </div></main>;
}
