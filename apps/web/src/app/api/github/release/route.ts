import { project } from "@pilotdeck/db";
import { db } from "../../../../lib/db";
import { hasValidGitHubSignature } from "../../../../lib/github-webhook";
import { applyProjectRelease } from "../../../../lib/project-context-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReleaseWebhookBody = {
  action?: unknown;
  repository?: { full_name?: unknown };
  release?: {
    id?: unknown;
    tag_name?: unknown;
    name?: unknown;
    body?: unknown;
    prerelease?: unknown;
    published_at?: unknown;
    html_url?: unknown;
  };
  sender?: { login?: unknown };
};

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function sameRepo(left: string | null, right: string): boolean {
  return Boolean(left && left.trim().toLowerCase() === right.trim().toLowerCase());
}

/** Receives GitHub's release.published webhook for every configured project. */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    console.warn("GITHUB_WEBHOOK_SECRET não configurada; webhook GitHub rejeitado.");
    return Response.json({ error: "webhook signature verification is not configured" }, { status: 401 });
  }
  if (!hasValidGitHubSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return Response.json({ error: "invalid webhook signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event && event !== "release") {
    return Response.json({ ignored: true });
  }

  const body = JSON.parse(rawBody) as ReleaseWebhookBody;
  const repository = asText(body?.repository?.full_name);
  const release = body?.release;
  const tagName = asText(release?.tag_name);
  if (!repository || !release || !tagName) {
    return Response.json({ error: "release webhook payload is incomplete" }, { status: 400 });
  }
  if (body?.action && body.action !== "published") {
    return Response.json({ ignored: true });
  }

  const database = db();
  const projects = await database
    .select()
    .from(project);
  const actor = asText(body?.sender?.login) ?? "github-webhook";
  let updated = 0;
  for (const row of projects) {
    if (!sameRepo(row.contextSource?.releasesRepo ?? null, repository)) continue;
    const result = await applyProjectRelease(database, row, {
      id:
        typeof release.id === "string" || typeof release.id === "number"
          ? release.id
          : null,
      repository,
      tagName,
      name: asText(release.name),
      body: typeof release.body === "string" ? release.body : null,
      prerelease: release.prerelease === true,
      publishedAt: asText(release.published_at),
      url: asText(release.html_url),
    }, { actor });
    if (result.updated) updated += 1;
  }

  return Response.json({ ok: true, projects: updated });
}
