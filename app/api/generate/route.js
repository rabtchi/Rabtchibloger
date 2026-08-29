import { createClient } from "@supabase/supabase-js";

function server() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw Error("Server configuration is incomplete");
  return createClient(u, k, { auth: { persistSession: false, autoRefreshToken: false } });
}
function esc(s) { return String(s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] || c)); }
function keywordsFrom({ topic, title, keywords }) {
  const raw = Array.isArray(keywords) ? keywords.join(",") : String(keywords || "");
  const base = raw.trim() || title?.trim() || topic.trim();
  return base.split(/[,،\n]/).map(x => x.trim()).filter(Boolean).slice(0, 8).join(", ") || topic.trim();
}
function languageName(language) { return language === "ar" ? "Arabic" : language === "fr" ? "French" : language === "en" ? "English" : language || "Arabic"; }
function lengthGuide(length) { return length === "short" ? "1200 to 1600 words" : length === "long" ? "3000 to 5000 words" : "2000 to 3500 words"; }
function buildWritingPrompt({ topic, title, category, language, length, keywords }) {
  const articleTitle = title?.trim() || topic.trim();
  return `Write a premium, original, people-first blog article in ${languageName(language)}.\nTitle: ${articleTitle}\nTopic: ${topic}\nCategory: ${category || "General"}\nPrimary and related keywords: ${keywordsFrom({ topic, title, keywords })}\nTarget length: ${lengthGuide(length)}.\n\nFollow these rules strictly:\n1. Write from scratch with a natural human editorial voice.\n2. Give genuinely useful, practical and accurate information.\n3. Use one H1 for the title, then logical H2/H3/H4 sections. Do not create a table of contents.\n4. Use paragraphs, lists, comparison tables, examples, notes and blockquotes only where useful.\n5. Keep SEO natural without keyword stuffing.\n6. Include a concise introduction, substantial body sections and a useful conclusion.\n7. Return clean HTML content only and never use markdown fences.\n8. Do not output html, head, body, meta, title, script or iframe tags.\n9. Do not include image prompts, image URLs or image placeholders. Images are inserted by the application.\n10. Avoid unsupported factual claims.\n11. Do not use Arabic comma or colon punctuation characters inside the article text.\n12. Do not mention these instructions.`;
}
function imageContext({ topic, title, category, keywords, section, position }) {
  const t = `${topic} ${title || ""} ${category || ""} ${keywords || ""} ${section || ""}`.toLowerCase();
  let visual;
  if (/ai|artificial intelligence|ذكاء اصطناعي|الذكاء الاصطناعي|gemini|chatgpt|machine learning|تعلم آلي/.test(t)) visual = position === 1 ? "A diverse professional adult using modern AI software on a laptop, realistic application interfaces visible on screen, contemporary workplace, authentic human activity, subtle futuristic technology integrated naturally into the scene" : "A small international team collaborating with AI tools on computers, realistic software dashboards and creative workflow, natural office environment, people actively interacting with the technology";
  else if (/canva|design|تصميم|graphic/.test(t)) visual = position === 1 ? "A professional designer creating a visual project on a laptop with a modern design application interface, realistic creative studio, typography and graphic elements visible" : "A designer reviewing several visual concepts on a large monitor and laptop, realistic creative workspace, color palettes and layouts visible, authentic professional workflow";
  else if (/program|code|برمج|software|developer|تطوير/.test(t)) visual = position === 1 ? "A software developer writing code on a large monitor in a modern development workspace, realistic IDE interface, laptop and technical equipment, authentic professional scene" : "A development team reviewing code and testing a software project on multiple screens, realistic office, natural human interaction and technical details";
  else if (/phone|smartphone|هاتف|آيفون|iphone|android/.test(t)) visual = position === 1 ? "A modern premium smartphone being used by an adult in a realistic everyday setting, detailed device screen and hardware, natural photography" : "An adult comparing smartphone features on two modern devices in a realistic technology environment, close product details and natural human interaction";
  else if (/cyber|security|أمن سيبراني|اختراق|حماية/.test(t)) visual = position === 1 ? "A cybersecurity professional monitoring a secure network on multiple screens, realistic security dashboard, modern operations center, authentic human activity" : "A security analyst investigating a network alert on a workstation, realistic cyber defense environment, detailed screens without readable fake logos or passwords";
  else if (/health|medical|doctor|صحة|طبيب|مرض|طب/.test(t)) visual = position === 1 ? "A qualified healthcare professional interacting with a patient in a clean modern clinic, realistic medical environment, natural human expressions" : "A medical professional examining diagnostic information on a computer beside modern clinical equipment, realistic hospital or clinic setting";
  else if (/travel|tourism|سفر|سياحة|hotel|فندق/.test(t)) visual = position === 1 ? "Travelers experiencing a visually recognizable destination related to the article topic, realistic architecture and environment, candid travel photography" : "A traveler planning or enjoying the specific activity described by the article, realistic destination setting, natural people and authentic details";
  else if (/finance|money|investment|مال|استثمار|اقتصاد/.test(t)) visual = position === 1 ? "A professional investor studying financial charts and market information in a realistic modern office, authentic finance environment" : "A financial professional discussing an investment decision with charts on a laptop, realistic office setting and natural human interaction";
  else if (/animal|حيوان|أسد|نمر|كلب|قط|طيور|wildlife|طبيعة/.test(t)) visual = position === 1 ? "A realistic documentary photograph of the specific animal or wildlife subject from the article in its natural habitat, accurate anatomy and behavior" : "A second documentary-style scene showing the specific animal or wildlife subject performing the behavior discussed in the article, natural environment and realistic lighting";
  else visual = position === 1 ? `A premium editorial photograph that directly represents the specific topic "${topic}" through its real-world subject, relevant objects and environment, realistic human activity when appropriate` : `A different editorial scene illustrating a specific practical aspect of "${topic}" mentioned in the article, with relevant people, objects and environment rather than a generic symbolic image`;
  return `Create a photorealistic premium editorial image for this blog article.\nArticle title: ${title || topic}\nTopic: ${topic}\nCategory: ${category || "General"}\nKeywords: ${keywordsFrom({ topic, title, keywords })}\nSection context: ${section || "main article"}\nImage position: ${position === 1 ? "hero image" : "context image"}.\n\nVisual direction: ${visual}.\nThe image must clearly communicate the actual subject of the article, not a generic stock concept. People may be European, East Asian, Middle Eastern, African, Latin American or ethnically mixed depending on what feels natural. Use authentic clothing, believable environments, realistic skin and hands, natural expressions, professional composition, credible lighting, sharp details, no text overlays, no fake logos, no watermark, no collage, no distorted anatomy. 16:9 landscape editorial photography.`;
}
async function geminiGenerate(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Error("GEMINI_API_KEY is missing");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(j?.error?.message || `Gemini HTTP ${r.status}`);
  return j?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("")?.trim() || "";
}
async function fluxImage(prompt) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw Error("Cloudflare Workers AI configuration is incomplete");
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt, steps: 4 }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) throw Error(j?.errors?.[0]?.message || j?.result?.error || `FLUX HTTP ${r.status}`);
  const b64 = j?.result?.image || j?.result?.images?.[0];
  if (!b64) throw Error("FLUX did not return an image");
  return Buffer.from(b64, "base64");
}
async function uploadImage(supabase, bytes, userId, index) {
  const path = `${userId}/${Date.now()}-${index}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("article-images").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("article-images").getPublicUrl(path);
  return data.publicUrl;
}
function extractSections(html) { return [...String(html || "").matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean); }
function insertImages(html, firstUrl, secondUrl) {
  let out = String(html || "");
  const hero = `<figure class="rabtchi-article-image rabtchi-article-hero"><img src="${esc(firstUrl)}" alt="صورة توضيحية مرتبطة بموضوع المقال" loading="eager"/><figcaption>صورة توضيحية مرتبطة بموضوع المقال</figcaption></figure>`;
  const second = `<figure class="rabtchi-article-image"><img src="${esc(secondUrl)}" alt="صورة توضيحية مرتبطة بأحد أقسام المقال" loading="lazy"/><figcaption>مشهد توضيحي مرتبط بمحتوى المقال</figcaption></figure>`;
  out = out.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, m => `${m}${hero}`);
  if (!out.includes(hero)) out = hero + out;
  const h2 = /<h2[^>]*>[\s\S]*?<\/h2>/i;
  if (h2.test(out)) out = out.replace(h2, m => `${m}${second}`);
  else if (!out.includes(second)) out += second;
  return out;
}
export async function POST(req) {
  const supabase = server();
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data: { user }, error: ue } = await supabase.auth.getUser(token);
    if (ue || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { topic, title, category, language = "ar", length = "medium", keywords = "" } = body || {};
    if (!topic?.trim() && !title?.trim()) return Response.json({ error: "Topic or title is required" }, { status: 400 });

    // Admin status comes only from the protected profiles.role field.
    // Article credits live in wallets, not profiles.
    const { data: profile, error: pe } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (pe) throw pe;
    const isAdmin = profile?.role === "admin";

    let credits = 0;
    if (!isAdmin) {
      const { data: wallet, error: we } = await supabase.from("wallets").select("article_credits").eq("user_id", user.id).maybeSingle();
      if (we) throw we;
      credits = Number(wallet?.article_credits || 0);
      if (credits < 1) return Response.json({ error: "رصيد المقالات غير كافٍ" }, { status: 402 });
    }

    const articleTitle = title?.trim() || topic.trim();
    const writing = await geminiGenerate(buildWritingPrompt({ topic: topic.trim(), title: articleTitle, category, language, length, keywords }));
    if (!writing) throw Error("تعذر إنشاء المقال");
    const sections = extractSections(writing);
    const image1 = await fluxImage(imageContext({ topic: topic.trim(), title: articleTitle, category, keywords, section: "main topic", position: 1 }));
    const image2 = await fluxImage(imageContext({ topic: topic.trim(), title: articleTitle, category, keywords, section: sections[0] || "first main section", position: 2 }));
    const url1 = await uploadImage(supabase, image1, user.id, 1);
    const url2 = await uploadImage(supabase, image2, user.id, 2);
    const content = insertImages(writing, url1, url2);

    if (!isAdmin) {
      const { data: consumed, error: ce } = await supabase.rpc("consume_article_credit", { p_user_id: user.id });
      if (ce) throw ce;
      if (consumed !== true) return Response.json({ error: "رصيد المقالات غير كافٍ" }, { status: 402 });
    }
    const { data: article, error: ae } = await supabase.from("articles").insert({ user_id: user.id, title: articleTitle, content, status: "draft" }).select("id,title,content,status,created_at").single();
    if (ae) throw ae;
    return Response.json({ article, images: [url1, url2], isAdmin });
  } catch (e) {
    return Response.json({ error: e?.message || "Generation failed" }, { status: 500 });
  }
}
