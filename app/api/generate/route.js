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
function imageBriefPrompt({ topic, title, category, keywords, article, sections }) {
  return `Analyze the following finished blog article and create exactly TWO highly specific visual briefs for AI image generation. The images must represent the actual article, not just its broad category.\n\nArticle title: ${title}\nTopic: ${topic}\nCategory: ${category || "General"}\nKeywords: ${keywordsFrom({ topic, title, keywords })}\nArticle HTML:\n${String(article).slice(0, 24000)}\n\nMain sections: ${sections.join(" | ")}\n\nReturn ONLY valid JSON in this exact shape:\n{"images":[{"role":"hero","section":"main topic","scene":"...","subjects":"...","action":"...","environment":"...","objects":"..."},{"role":"context","section":"...","scene":"...","subjects":"...","action":"...","environment":"...","objects":"..."}]}\n\nRules for the briefs:\n- The hero must summarize the central idea of the article with a concrete real-world scene.\n- The context image must illustrate a DIFFERENT specific idea from one actual H2 section.\n- If the article is about software, show people actually using the relevant type of software and the practical task discussed.\n- If the article is about AI, show realistic people using AI tools for the exact task discussed, not a generic robot unless robots are the actual topic.\n- If the article is about a product, show the product in the actual use case discussed.\n- If it is about a place, show the real type of place or activity discussed.\n- If it is about health, science or animals, use the specific subject and context from the article.\n- People can be European, East Asian, Middle Eastern, African, Latin American or mixed when natural. Do not force one ethnicity.\n- Do not invent a scene unrelated to the article.\n- No text overlays, fake logos, watermarks or generic abstract symbols.`;
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
async function getImageBriefs({ topic, title, category, keywords, article, sections }) {
  const raw = await geminiGenerate(imageBriefPrompt({ topic, title, category, keywords, article, sections }));
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.images) || parsed.images.length < 2) throw Error("Invalid image briefs");
    return parsed.images.slice(0, 2);
  } catch {
    return [
      { role: "hero", section: "main topic", scene: `A realistic editorial scene directly representing ${topic}`, subjects: "relevant people or objects from the article", action: "performing the main activity described", environment: "a believable real-world environment", objects: "specific objects mentioned in the article" },
      { role: "context", section: sections[0] || "first main section", scene: `A realistic scene illustrating ${sections[0] || topic}`, subjects: "relevant people or objects", action: "performing the activity described in this section", environment: "a believable context from the article", objects: "specific objects relevant to the section" }
    ];
  }
}
function imagePromptFromBrief({ topic, title, brief, position }) {
  return `Create a photorealistic premium editorial photograph for a blog article.\nArticle title: ${title}\nOverall topic: ${topic}\nImage role: ${position === 1 ? "hero image" : "context image"}\nRelevant section: ${brief.section || "main topic"}\n\nExact visual brief:\nScene: ${brief.scene}\nSubjects: ${brief.subjects}\nAction: ${brief.action}\nEnvironment: ${brief.environment}\nRelevant objects: ${brief.objects}\n\nThe scene must visibly communicate the exact idea above. Do not substitute a generic image for the topic. Show realistic human behavior, believable proportions, natural expressions, realistic hands and skin, authentic environments and professional editorial composition. People may be European, East Asian, Middle Eastern, African, Latin American or ethnically mixed according to the scene. Do not force Arabic-looking people. If software or technology is relevant, show a believable interface and device use without readable fake text or invented brand logos. No text overlays, no fake logos, no watermark, no collage, no unrelated objects, no fantasy elements unless explicitly required by the article. 16:9 landscape.`;
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function isTemporaryFluxError(message) { return /high demand|temporarily|try again later|rate limit|too many requests|overloaded|unavailable|429|capacity/i.test(String(message || "")); }
async function fluxImage(prompt) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw Error("Cloudflare Workers AI configuration is incomplete");
  const maxAttempts = 4;
  let lastError = "FLUX generation failed";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt, steps: 4 }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false) {
        lastError = j?.errors?.[0]?.message || j?.result?.error || `FLUX HTTP ${r.status}`;
        if (attempt < maxAttempts && (r.status === 429 || r.status >= 500 || isTemporaryFluxError(lastError))) { await sleep(2500 * attempt); continue; }
        throw Error(lastError);
      }
      const b64 = j?.result?.image || j?.result?.images?.[0];
      if (!b64) throw Error("FLUX did not return an image");
      return Buffer.from(b64, "base64");
    } catch (e) {
      lastError = e?.message || lastError;
      if (attempt < maxAttempts && isTemporaryFluxError(lastError)) { await sleep(2500 * attempt); continue; }
      throw Error(lastError);
    }
  }
  throw Error(lastError);
}
async function uploadImage(supabase, bytes, userId, index) {
  const path = `${userId}/${Date.now()}-${index}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("article-images").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return supabase.storage.from("article-images").getPublicUrl(path).data.publicUrl;
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
    const { data: profile, error: pe } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (pe) throw pe;
    const isAdmin = profile?.role === "admin";
    if (!isAdmin) {
      const { data: wallet, error: we } = await supabase.from("wallets").select("article_credits").eq("user_id", user.id).maybeSingle();
      if (we) throw we;
      if (Number(wallet?.article_credits || 0) < 1) return Response.json({ error: "رصيد المقالات غير كافٍ" }, { status: 402 });
    }
    const articleTitle = title?.trim() || topic.trim();
    const writing = await geminiGenerate(buildWritingPrompt({ topic: topic.trim(), title: articleTitle, category, language, length, keywords }));
    if (!writing) throw Error("تعذر إنشاء المقال");
    const sections = extractSections(writing);
    const briefs = await getImageBriefs({ topic: topic.trim(), title: articleTitle, category, keywords, article: writing, sections });
    const image1 = await fluxImage(imagePromptFromBrief({ topic: topic.trim(), title: articleTitle, brief: briefs[0], position: 1 }));
    const image2 = await fluxImage(imagePromptFromBrief({ topic: topic.trim(), title: articleTitle, brief: briefs[1], position: 2 }));
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
