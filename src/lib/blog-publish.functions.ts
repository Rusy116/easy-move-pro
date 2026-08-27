// ---------------------------------------------------------------------------
// BLOG PUBLISHING — admin-gated server layer.
//
// ai_content_items = private AI staging workspace (draft / approved / published)
// blog_posts       = public source of truth (RLS: public reads published only)
//
// All writes run as the authenticated admin through existing RLS policies.
// No service-role client is used anywhere in this module.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

const BLOG_KINDS = ["blog_article", "blog"] as const;
const SLUG_RE = /^[a-z0-9-]+$/;

const MAX = {
  title: 200,
  slug: 120,
  summary: 500,
  body: 200_000,
  seoTitle: 120,
  seoDescription: 320,
};

async function assertAdmin(context: Ctx) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!isAdmin) throw new Error("Forbidden");
}

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

type DraftRow = {
  id: string;
  kind: string;
  title: string | null;
  slug: string | null;
  summary: string | null;
  body: string | null;
  seo: Record<string, unknown> | null;
  status: string;
  published_at: string | null;
};

async function loadDraft(context: Ctx, contentItemId: string): Promise<DraftRow> {
  if (!contentItemId || typeof contentItemId !== "string") {
    throw new Error("contentItemId is required");
  }
  const { data, error } = await context.supabase
    .from("ai_content_items")
    .select("id, kind, title, slug, summary, body, seo, status, published_at")
    .eq("id", contentItemId)
    .maybeSingle();
  if (error) throw new Error(`Draft lookup failed: ${error.message}`);
  if (!data) throw new Error("Draft not found");
  if (!BLOG_KINDS.includes(data.kind)) {
    throw new Error(`Content item is not a blog draft (kind=${data.kind})`);
  }
  return data as DraftRow;
}

/** Validates the fields required for a publishable blog draft. */
function validatePublishable(row: {
  title?: string | null;
  slug?: string | null;
  summary?: string | null;
  body?: string | null;
  seo?: Record<string, unknown> | null;
}) {
  const title = s(row.title);
  const slug = s(row.slug);
  const body = s(row.body);
  const summary = s(row.summary);
  const seo = (row.seo ?? {}) as Record<string, unknown>;
  const seoTitle = s(seo["title"]);
  const seoDescription = s(seo["description"]);

  if (!title) throw new Error("Title is required");
  if (title.length > MAX.title) throw new Error("Title is too long");
  if (!slug) throw new Error("Slug is required");
  if (!SLUG_RE.test(slug)) throw new Error("Slug must match ^[a-z0-9-]+$");
  if (slug.length > MAX.slug) throw new Error("Slug is too long");
  if (!body) throw new Error("Body is required");
  if (body.length > MAX.body) throw new Error("Body is too long");
  if (summary.length > MAX.summary) throw new Error("Summary is too long");
  if (seoTitle.length > MAX.seoTitle) throw new Error("SEO title is too long");
  if (seoDescription && seoDescription.length < 50) {
    throw new Error("SEO description should be at least 50 characters");
  }
  if (seoDescription.length > MAX.seoDescription) {
    throw new Error("SEO description is too long");
  }

  return { title, slug, body, summary, seoTitle, seoDescription };
}

// ── 1. saveBlogDraft ───────────────────────────────────────────────────────
export const saveBlogDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      contentItemId: string;
      title: string;
      slug: string;
      summary?: string;
      body: string;
      seoTitle?: string;
      seoDescription?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const draft = await loadDraft(context as Ctx, data.contentItemId);

    const v = validatePublishable({
      title: data.title,
      slug: data.slug,
      summary: data.summary ?? "",
      body: data.body,
      seo: { title: data.seoTitle ?? "", description: data.seoDescription ?? "" },
    });

    const seo = {
      ...((draft.seo ?? {}) as Record<string, unknown>),
      title: v.seoTitle || v.title,
      description: v.seoDescription || v.summary,
    };

    const { error } = await (context as Ctx).supabase
      .from("ai_content_items")
      .update({
        title: v.title,
        slug: v.slug,
        summary: v.summary || null,
        body: v.body,
        seo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id);
    if (error) throw new Error(`Save failed: ${error.message}`);

    return { ok: true as const, contentItemId: draft.id, slug: v.slug };
  });

// ── 2. approveBlogDraft ────────────────────────────────────────────────────
export const approveBlogDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contentItemId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const draft = await loadDraft(context as Ctx, data.contentItemId);
    validatePublishable(draft);

    const { error } = await (context as Ctx).supabase
      .from("ai_content_items")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", draft.id);
    if (error) throw new Error(`Approve failed: ${error.message}`);

    return { ok: true as const, contentItemId: draft.id, status: "approved" as const };
  });

// ── 3. publishBlogDraft ────────────────────────────────────────────────────
export const publishBlogDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contentItemId: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const draft = await loadDraft(ctx, data.contentItemId);

    if (draft.status === "archived") throw new Error("Archived drafts cannot be published");
    const v = validatePublishable(draft);

    const now = new Date().toISOString();

    // Existing public row (slug is the physical uniqueness boundary).
    const { data: existing, error: exErr } = await ctx.supabase
      .from("blog_posts")
      .select("id, published_at")
      .eq("slug", v.slug)
      .maybeSingle();
    if (exErr) throw new Error(`Blog lookup failed: ${exErr.message}`);

    // PUBLIC WRITE FIRST — idempotent on the unique slug.
    const { data: post, error: upErr } = await ctx.supabase
      .from("blog_posts")
      .upsert(
        {
          slug: v.slug,
          title: v.title,
          excerpt: v.summary || null,
          body: v.body, // original Markdown, untransformed
          published: true,
          published_at: existing?.published_at ?? now,
          updated_at: now,
          author_id: ctx.userId,
        },
        { onConflict: "slug" },
      )
      .select("id, slug, published_at")
      .single();
    if (upErr) throw new Error(`Publish failed: ${upErr.message}`);

    // AI staging status SECOND — only after the public upsert succeeded.
    const { error: stErr } = await ctx.supabase
      .from("ai_content_items")
      .update({ status: "published", published_at: now, updated_at: now })
      .eq("id", draft.id);
    if (stErr) throw new Error(`Published, but staging update failed: ${stErr.message}`);

    return {
      ok: true as const,
      postId: post.id as string,
      slug: post.slug as string,
      url: `/blog/${post.slug}`,
      publishedAt: post.published_at as string | null,
      created: !existing,
    };
  });

// ── 4. unpublishBlogDraft ──────────────────────────────────────────────────
export const unpublishBlogDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contentItemId: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const draft = await loadDraft(ctx, data.contentItemId);

    const slug = s(draft.slug);
    if (!slug || !SLUG_RE.test(slug)) throw new Error("Draft has no valid slug");

    const now = new Date().toISOString();

    // Hide publicly; keep the row, body and original published_at.
    const { data: post, error } = await ctx.supabase
      .from("blog_posts")
      .update({ published: false, updated_at: now })
      .eq("slug", slug)
      .select("id, slug, published_at")
      .maybeSingle();
    if (error) throw new Error(`Unpublish failed: ${error.message}`);

    // Back to 'draft' — the only status the existing model uses for editable
    // staging rows ('review' is not part of the current status vocabulary).
    const { error: stErr } = await ctx.supabase
      .from("ai_content_items")
      .update({ status: "draft", updated_at: now })
      .eq("id", draft.id);
    if (stErr) throw new Error(`Unpublished, but staging update failed: ${stErr.message}`);

    return {
      ok: true as const,
      contentItemId: draft.id,
      slug,
      postId: (post?.id as string | undefined) ?? null,
      published: false as const,
      status: "draft" as const,
    };
  });
