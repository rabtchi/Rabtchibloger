import { createClient } from "@supabase/supabase-js";

function server() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw Error("Server configuration is incomplete");
  return createClient(u, k, { auth: { persistSession: false, autoRefreshToken: false } });
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

function keywordsFrom({ topic, title, keywords }) {
  const raw = Array.isArray(keywords) ? keywords.join(",") : String(keywords || "");
  const base = raw.trim() || title?.trim() || topic.trim();
  return base.split(/[,،\n]/).map(x => x.trim()).filter(Boolean).slice(0, 10).join(", ") || topic.trim();
}

function languageName(language) {
  return language === "ar" ? "Arabic" : language === "fr" ? "French" : language === "en" ? "English" : language || "Arabic";
}

function lengthGuide(length) {
  return length === "short" ? "1400 to 1800 words" : length === "long" ? "3000 to 5000 words" : "2200 to 3500 words";
}

function buildWritingPrompt({ topic, title, category, language, length, keywords }) {
  const articleTitle = title?.trim() || topic.trim();
  return `You are the senior editor of a premium multilingual publishing platform. Write a completely original, people-first, publication-ready blog article in ${languageName(language)}.

INPUT
Title: ${articleTitle}
Topic: ${topic}
Category: ${category || "General"}
Primary and related keywords: ${keywordsFrom({ topic, title, keywords })}
Target length: ${lengthGuide(length)}.

EDITORIAL STANDARD
The article must feel like a carefully edited professional reference, not an AI draft. Give the reader a complete answer, practical details, examples, useful comparisons and clear takeaways. Apply People-First and E-E-A-T principles. Never invent facts, prices, statistics, features or personal experiences. If a fact is uncertain, phrase it carefully or omit it. Do not pad the article.

MANDATORY STRUCTURE
1. Return the article body as clean HTML only. Do not return Markdown or code fences.
2. Do NOT output html, head, body, meta, title, script or iframe tags.
3. Do NOT create a table of contents or navigation table.
4. Use the article title as the only H1 if a title heading is needed. The FIRST section heading after the introduction must be H2. Use H3 for main sections and H4 for useful subsections. Do not use heading levels just for decoration.
5. Start with a short engaging introduction. Immediately provide an Answer First paragraph or compact list that answers the main question. Then explain what the guide covers.
6. Build a logical progression from fundamentals to practical application, comparison, mistakes or limitations, recommendations and a useful conclusion.
7. Use professional HTML tables when a comparison genuinely benefits the reader. Tables must have clear th headers and concise td cells.
8. Use ul and ol lists where they improve scanning. Lists must be semantically correct and easy to read.
9. Use blockquote for important advice or a memorable fact. Use div class="note" for warnings, tips or important information. Do not overuse either element.
10. When mentioning an external website or tool, add a real external link with target="_blank" rel="nofollow noopener noreferrer". Never invent URLs. If you cannot provide a verified URL, mention the name without a link.
11. Do not include image URLs, image prompts, image placeholders or fake image elements. Images are inserted by the application.

REFERENCE DESIGN SYSTEM
The supplied professional-writing reference requires the article to be visually rich, easy to scan, professionally structured and styled like the supplied formatting example. Reproduce the DESIGN LANGUAGE rather than copying text: clean typography, generous but controlled vertical spacing, clear heading hierarchy, readable paragraphs, polished tables, restrained callout boxes and blockquotes. The styling must remain local to the article and must never target body, html, global headings, global paragraphs or other site-wide selectors.

Use ONLY these optional article classes when useful: article-lead, answer-first, note, warning, key-takeaway, comparison-table, article-quote, article-section. Keep class names scoped with the article root where possible. Prefer semantic HTML and minimal inline style. Do not create visually aggressive CSS.

ARTICLE CSS CONTRACT
If CSS is needed inside the returned article, wrap it in exactly one scoped style block using a unique root class such as .rabtchi-content and prefix every selector with .rabtchi-content. Never write global selectors such as body, html, h1, h2, p, img or table. The CSS should provide readable typography, clear H2/H3/H4 hierarchy, paragraph spacing, responsive tables, restrained notes, blockquotes and safe responsive media. Every image must use max-width:100%; width:auto or 100% as appropriate; height:auto; display:block. Tables must be max-width:100% and horizontally scrollable on narrow screens. Long words, URLs and code must wrap or scroll without overflowing.

IMPORTANT FORMAT RULES FROM THE REFERENCE
- Arabic should be fluent Modern Standard Arabic with a friendly human tone. French and English should be equally natural in their own language.
- Do not use Arabic comma or Arabic colon punctuation characters in the generated prose. Use periods and natural sentence breaks instead.
- Keep numbered and bulleted lists visually balanced. Do not put list markers in the middle of paragraphs.
- Do not add a side margin to the article content. The article should be able to occupy the full width of its parent container.
- Do not add meta tags or document-level HTML.
- The article must be fully original and written from scratch.
- Make the content substantial and genuinely useful rather than merely long.

QUALITY CHECK BEFORE RETURNING
Silently check that the topic is respected throughout. Remove generic filler. Verify that headings have a logical hierarchy. Verify that tables and lists are valid HTML. Verify that no global CSS selectors exist. Verify that no image placeholder exists. Verify that no TOC exists. Verify that the article can be inserted inside a div without changing the rest of the website. Then return ONLY the final HTML article.`;
}

async function geminiGenerate(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Error("GEMINI_API_KEY is missing");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.55 } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j?.error?.message || `Gemini HTTP ${r.status}`);
    e.providerStatus = r.status;
    throw e;
  }
  return j?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("")?.trim() || "";
}

function extractSections(html) {
  return [...String(html || "").matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);
}

function extractSectionContext(html, sectionIndex = 0) {
  const source = String(html || "");
  const matches = [...source.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  if (!matches.length) return source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1800);
  const start = matches[sectionIndex]?.index ?? 0;
  const end = matches[sectionIndex + 1]?.index ?? source.length;
  return source.slice(start, end).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2200);
}

function buildLocalImageBriefs({ topic, title, category, keywords, article, sections }) {
  const section = sections[0] || topic;
  const context = extractSectionContext(article, 0);
  return [
    {
      role: "hero",
      section: "main topic",
      scene: `A realistic editorial scene that directly visualizes the central subject of the article titled ${title}. The scene must be based on this topic: ${topic}.`,
      subjects: `People, products, tools or environments explicitly relevant to ${category || "the topic"}`,
      action: "Performing the main real-world activity described in the article",
      environment: "A believable real-world setting appropriate to the subject",
      objects: `Specific objects and visual cues supported by the article keywords: ${keywordsFrom({ topic, title, keywords })}`
    },
    {
      role: "context",
      section,
      scene: `A realistic editorial scene illustrating the specific section ${section}. Section context: ${context}`,
      subjects: "The exact people, products, animals, places or tools relevant to this section",
      action: "Performing or demonstrating the activity explained in this section",
      environment: "The real-world context implied by the section",
      objects: "Only relevant objects supported by the article"
    }
  ];
}

function imagePromptFromBrief({ topic, title, brief, position }) {
  return `Create a photorealistic premium editorial photograph for a blog article.
Article title: ${title}
Overall topic: ${topic}
Image role: ${position === 1 ? "hero image" : "context image"}
Relevant section: ${brief.section || "main topic"}

Exact visual brief:
Scene: ${brief.scene}
Subjects: ${brief.subjects}
Action: ${brief.action}
Environment: ${brief.environment}
Relevant objects: ${brief.objects}

The scene must visibly communicate the exact idea above and remain tightly relevant to the article. Use realistic human behavior, believable proportions, natural expressions, realistic hands and skin, authentic environments and professional editorial composition. People may be European, East Asian, Middle Eastern, African, Latin American or ethnically mixed when natural. No generic category image. No text overlays, fake logos, watermarks, collage, unrelated objects or fantasy unless required by the subject. Keep a generous clean safety buffer around all edges because the website adds its own frame and crop. 16:9 landscape.`;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function isTemporaryFluxError(message) {
  return /high demand|temporarily|try again later|rate limit|too many requests|overloaded|unavailable|429|capacity/i.test(String(message || ""));
}

async function fluxImage(prompt) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw Error("Cloudflare Workers AI configuration is incomplete");
  let lastError = "FLUX generation failed";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, steps: 4 })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false) {
        lastError = j?.errors?.[0]?.message || j?.result?.error || `FLUX HTTP ${r.status}`;
        if (attempt < 4 && (r.status === 429 || r.status >= 500 || isTemporaryFluxError(lastError))) {
          await sleep(2500 * attempt);
          continue;
        }
        throw Error(lastError);
      }
      const b64 = j?.result?.image || j?.result?.images?.[0];
      if (!b64) throw Error("FLUX did not return an image");
      return Buffer.from(b64, "base64");
    } catch (e) {
      lastError = e?.message || lastError;
      if (attempt < 4 && isTemporaryFluxError(lastError)) {
        await sleep(2500 * attempt);
        continue;
      }
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

function insertImages(html, firstUrl, secondUrl) {
  let out = String(html || "");
  const hero = `<figure class="rabtchi-article-image rabtchi-article-hero"><img src="${esc(firstUrl)}" alt="صورة توضيحية مرتبطة بموضوع المقال" loading="eager"/><figcaption>صورة توضيحية مرتبطة بموضوع المقال</figcaption></figure>`;
  const second = `<figure class="rabtchi-article-image"><img src="${esc(secondUrl)}" alt="صورة توضيحية مرتبطة بأحد أقسام المقال" loading="lazy"/><figcaption>مشهد توضيحي مرتبط بمحتوى المقال</figcaption></figure>`;
  if (/<h1[^>]*>[\s\S]*?<\/h1>/i.test(out)) out = out.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, m => `${m}${hero}`);
  else out = hero + out;
  if (/<h2[^>]*>[\s\S]*?<\/h2>/i.test(out)) out = out.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, m => `${m}${second}`);
  else out += second;
  return out;
}

function friendlyProviderError(e) {
  const m = String(e?.message || "");
  if (e?.providerStatus === 429 || /quota exceeded|rate limit|resource exhausted|too many requests/i.test(m)) {
    return "خدمة الكتابة مشغولة حاليًا. حاول مرة أخرى بعد قليل. لم يتم خصم رصيدك.";
  }
  if (/high demand|capacity|temporarily unavailable|try again later/i.test(m)) {
    return "خدمة توليد الصور مشغولة حاليًا. حاول مرة أخرى بعد قليل. لم يتم خصم رصيدك.";
  }
  return m || "تعذر إنشاء المقال حاليًا. لم يتم خصم رصيدك.";
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
    let writing;
    try {
      writing = await geminiGenerate(buildWritingPrompt({ topic: topic.trim(), title: articleTitle, category, language, length, keywords }));
    } catch (e) {
      return Response.json({ error: friendlyProviderError(e) }, { status: e?.providerStatus === 429 ? 429 : 500 });
    }
    if (!writing) return Response.json({ error: "تعذر إنشاء المقال حاليًا. لم يتم خصم رصيدك." }, { status: 500 });

    const sections = extractSections(writing);
    const briefs = buildLocalImageBriefs({ topic: topic.trim(), title: articleTitle, category, keywords, article: writing, sections });

    let image1, image2;
    try {
      image1 = await fluxImage(imagePromptFromBrief({ topic: topic.trim(), title: articleTitle, brief: briefs[0], position: 1 }));
      image2 = await fluxImage(imagePromptFromBrief({ topic: topic.trim(), title: articleTitle, brief: briefs[1], position: 2 }));
    } catch (e) {
      return Response.json({ error: friendlyProviderError(e) }, { status: 500 });
    }

    let url1, url2;
    try {
      url1 = await uploadImage(supabase, image1, user.id, 1);
      url2 = await uploadImage(supabase, image2, user.id, 2);
    } catch (e) {
      return Response.json({ error: "تعذر حفظ الصور حاليًا. لم يتم خصم رصيدك." }, { status: 500 });
    }

    const content = insertImages(writing, url1, url2);

    if (!isAdmin) {
      const { data: consumed, error: ce } = await supabase.rpc("consume_article_credit", { p_user_id: user.id });
      if (ce) return Response.json({ error: "تعذر تأكيد خصم الرصيد. لم يتم خصم رصيدك." }, { status: 500 });
      if (consumed !== true) return Response.json({ error: "رصيد المقالات غير كافٍ" }, { status: 402 });
    }

    const { data: article, error: ae } = await supabase.from("articles").insert({
      user_id: user.id,
      title: articleTitle,
      content,
      status: "draft"
    }).select("id,title,content,status,created_at").single();

    if (ae) return Response.json({ error: "تعذر حفظ المقال. يرجى المحاولة مرة أخرى." }, { status: 500 });
    return Response.json({ article, images: [url1, url2], isAdmin });
  } catch (e) {
    return Response.json({ error: friendlyProviderError(e) }, { status: 500 });
  }
}
