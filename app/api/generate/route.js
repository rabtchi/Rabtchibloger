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
  return base.split(/[,،\n]/).map(x => x.trim()).filter(Boolean).slice(0, 10).join(", ") || topic.trim();
}
function languageName(language) { return language === "ar" ? "Arabic" : language === "fr" ? "French" : language === "en" ? "English" : language || "Arabic"; }
function lengthGuide(length) { return length === "short" ? "1400 to 1800 words" : length === "long" ? "3000 to 5000 words" : "2200 to 3500 words"; }
function buildWritingPrompt({ topic, title, category, language, length, keywords }) {
  const articleTitle = title?.trim() || topic.trim();
  return `You are the senior editor of a premium multilingual publishing platform. Write a completely original, people-first, publication-ready blog article in ${languageName(language)}.\n\nINPUT\nTitle: ${articleTitle}\nTopic: ${topic}\nCategory: ${category || "General"}\nPrimary and related keywords: ${keywordsFrom({ topic, title, keywords })}\nTarget length: ${lengthGuide(length)}.\n\nEDITORIAL STANDARD\nThe article must feel like a carefully edited professional reference, not an AI draft. Give the reader a complete answer, practical details, examples, useful comparisons and clear takeaways. Apply People-First and E-E-A-T principles. Never invent facts, prices, statistics, features or personal experiences. If a fact is uncertain, phrase it carefully or omit it. Do not pad the article.\n\nMANDATORY STRUCTURE\n1. Return the article body as clean HTML only. Do not return Markdown or code fences.\n2. Do NOT output html, head, body, meta, title, script or iframe tags.\n3. Do NOT create a table of contents or navigation table.\n4. Use the article title as the only H1 if a title heading is needed. The FIRST section heading after the introduction must be H2. Use H3 for main sections and H4 for useful subsections. Do not use heading levels just for decoration.\n5. Start with a short engaging introduction. Immediately provide an Answer First paragraph or compact list that answers the main question. Then explain what the guide covers.\n6. Build a logical progression from fundamentals to practical application, comparison, mistakes or limitations, recommendations and a useful conclusion.\n7. Use professional HTML tables when a comparison genuinely benefits the reader. Tables must have clear th headers and concise td cells.\n8. Use ul and ol lists where they improve scanning. Lists must be semantically correct and easy to read.\n9. Use blockquote for important advice or a memorable fact. Use div class="note" for warnings, tips or important information. Do not overuse either element.\n10. When mentioning an external website or tool, add a real external link with target="_blank" rel="nofollow noopener noreferrer". Never invent URLs. If you cannot provide a verified URL, mention the name without a link.\n11. Do not include image URLs, image prompts, image placeholders or fake image elements. Images are inserted by the application.\n\nREFERENCE DESIGN SYSTEM\nThe supplied professional-writing reference requires the article to be visually rich, easy to scan, professionally structured and styled like the supplied formatting example. Reproduce the DESIGN LANGUAGE rather than copying text: clean typography, generous but controlled vertical spacing, clear heading hierarchy, readable paragraphs, polished tables, restrained callout boxes and blockquotes. The styling must remain local to the article and must never target body, html, global headings, global paragraphs or other site-wide selectors.\n\nUse ONLY these optional article classes when useful: article-lead, answer-first, note, warning, key-takeaway, comparison-table, article-quote, article-section. Keep class names scoped with the article root where possible. Prefer semantic HTML and minimal inline style. Do not create visually aggressive CSS.\n\nARTICLE CSS CONTRACT\nIf CSS is needed inside the returned article, wrap it in exactly one scoped style block using a unique root class such as .rabtchi-content and prefix every selector with .rabtchi-content. Never write global selectors such as body, html, h1, h2, p, img or table. The CSS should provide: readable typography, clear H2/H3/H4 hierarchy, paragraph spacing, responsive tables, restrained notes, blockquotes and safe responsive media. Every image must use max-width:100%; width:auto or 100% as appropriate; height:auto; display:block. Tables must be max-width:100% and horizontally scrollable on narrow screens. Long words, URLs and code must wrap or scroll without overflowing.\n\nIMPORTANT FORMAT RULES FROM THE REFERENCE\n- Arabic should be fluent Modern Standard Arabic with a friendly human tone. French and English should be equally natural in their own language.\n- Do not use Arabic comma or Arabic colon punctuation characters in the generated prose. Use periods and natural sentence breaks instead.\n- Keep numbered and bulleted lists visually balanced. Do not put list markers in the middle of paragraphs.\n- Do not add a side margin to the article content. The article should be able to occupy the full width of its parent container.\n- Do not add meta tags or document-level HTML.\n- The article must be fully original and written from scratch.\n- Make the content substantial and genuinely useful rather than merely long.\n\nQUALITY CHECK BEFORE RETURNING\nSilently check that the topic is respected throughout. Remove generic filler. Verify that headings have a logical hierarchy. Verify that tables and lists are valid HTML. Verify that no global CSS selectors exist. Verify that no image placeholder exists. Verify that no TOC exists. Verify that the article can be inserted inside a div without changing the rest of the website. Then return ONLY the final HTML article.`;
}
function imageBriefPrompt({ topic, title, category, keywords, article, sections }) {
  return `Analyze the following finished blog article and create exactly TWO highly specific visual briefs for AI image generation. The images must represent the actual article, not just its broad category.\n\nArticle title: ${title}\nTopic: ${topic}\nCategory: ${category || "General"}\nKeywords: ${keywordsFrom({ topic, title, keywords })}\nArticle HTML:\n${String(article).slice(0, 24000)}\n\nMain sections: ${sections.join(" | ")}\n\nReturn ONLY valid JSON in this exact shape:\n{"images":[{"role":"hero","section":"main topic","scene":"...","subjects":"...","action":"...","environment":"...","objects":"..."},{"role":"context","section":"...","scene":"...","subjects":"...","action":"...","environment":"...","objects":"..."}]}\n\nRules:\n- The hero must summarize the central idea with a concrete real-world scene.\n- The context image must illustrate a DIFFERENT specific idea from one actual H2 section.\n- Every visual detail must be supported by the article.\n- For software or AI topics show people actually performing the exact task discussed rather than generic robots or abstract technology.\n- For products show the actual use case. For places show the actual activity or environment. For health, science and animals use the specific subject and context.\n- People can be European, East Asian, Middle Eastern, African, Latin American or mixed when natural.\n- Do not invent unrelated scenes.\n- No text overlays, fake logos or watermarks.`;
}
async function geminiGenerate(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Error("GEMINI_API_KEY is missing");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.55 } }) });
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
  return `Create a photorealistic premium editorial photograph for a blog article.\nArticle title: ${title}\nOverall topic: ${topic}\nImage role: ${position === 1 ? "hero image" : "context image"}\nRelevant section: ${brief.section || "main topic"}\n\nExact visual brief:\nScene: ${brief.scene}\nSubjects: ${brief.subjects}\nAction: ${brief.action}\nEnvironment: ${brief.environment}\nRelevant objects: ${brief.objects}\n\nThe scene must visibly communicate the exact idea above. Use realistic human behavior, believable proportions, natural expressions, realistic hands and skin, authentic environments and professional editorial composition. People may be European, East Asian, Middle Eastern, African, Latin American or ethnically mixed according to the scene. No generic category image. No text overlays, no fake logos, no watermark, no collage, no unrelated objects, no fantasy elements unless explicitly required. Keep a clean medium safety buffer around all edges because the website adds its own frame and crop. 16:9 landscape.`;
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
