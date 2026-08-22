import { NextResponse } from "next/server";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { validateContent } from "@/lib/store-content";
import type { StoreContent } from "@/lib/types";

type GithubFile = { sha?: string };
type GithubHeaders = Record<string, string>;

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function safeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

async function persistDataImage(
  image: string,
  label: string,
  repository: string,
  branch: string,
  headers: GithubHeaders,
) {
  const match = image.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i);
  if (!match) return image;

  const extension = match[1].toLowerCase().replace("jpeg", "jpg");
  const content = match[2];
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  const hash = Array.from(new Uint8Array(digest)).slice(0, 6).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const publicPath = `/uploads/${safeFilePart(label)}-${hash}.${extension}`;
  const endpoint = `https://api.github.com/repos/${repository}/contents/public${publicPath}`;
  const existing = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });

  if (existing.ok) return publicPath;
  if (existing.status !== 404) throw new Error(`GitHub image lookup failed: ${existing.status}`);

  const upload = await fetch(endpoint, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `رفع صورة ${label} من لوحة التحكم`,
      content,
      branch,
    }),
  });
  if (!upload.ok) throw new Error(`GitHub image upload failed: ${upload.status}`);
  return publicPath;
}

export async function POST(request: Request) {
  if (!(await hasValidAdminSession(request))) {
    return NextResponse.json({ success: false, error: "انتهت جلسة الإدارة. سجل الدخول مجدداً." }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY ?? "joetomi/crumble-online-store";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const filePath = "data/store.json";

  if (!token) {
    return NextResponse.json({ success: false, error: "ربط GitHub غير مكتمل بعد." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as unknown;

    if (!validateContent(body)) {
      return NextResponse.json({ success: false, error: "محتوى المتجر غير صالح." }, { status: 400 });
    }

    const endpoint = `https://api.github.com/repos/${repository}/contents/${filePath}`;
    const headers: GithubHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "crumble-store-admin",
    };
    const content = structuredClone(body as StoreContent);

    for (const product of content.products) {
      product.image = await persistDataImage(product.image, `product-${product.id}`, repository, branch, headers);
    }
    for (const story of content.stories ?? []) {
      story.image = await persistDataImage(story.image, `story-${story.id}`, repository, branch, headers);
    }
    const currentResponse = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, {
      headers,
      cache: "no-store",
    });
    const currentFile = (await currentResponse.json().catch(() => ({}))) as GithubFile;

    if (!currentResponse.ok || !currentFile.sha) {
      return NextResponse.json({ success: false, error: "تعذر قراءة ملف المتجر من GitHub." }, { status: 502 });
    }

    const json = `${JSON.stringify(content, null, 2)}\n`;
    const updateResponse = await fetch(endpoint, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "تحديث محتوى متجر Crumble من لوحة التحكم",
        content: encodeBase64(json),
        sha: currentFile.sha,
        branch,
      }),
    });
    const result = (await updateResponse.json().catch(() => ({}))) as { commit?: { sha?: string }; message?: string };

    if (!updateResponse.ok || !result.commit?.sha) {
      console.error("GitHub store update failed", updateResponse.status, result.message);
      return NextResponse.json({ success: false, error: "تعذر حفظ ملف المتجر في GitHub. أعد المحاولة، وتأكد أن صلاحية الربط لم تنتهِ." }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "تم رفع التغييرات إلى GitHub، وبدأ Vercel إعادة إطلاق الموقع.",
      pushed: true,
      commit: result.commit.sha,
      content,
    });
  } catch (error) {
    console.error("Admin publish failed", error);
    return NextResponse.json({ success: false, error: "تعذر نشر التغييرات حالياً." }, { status: 500 });
  }
}
