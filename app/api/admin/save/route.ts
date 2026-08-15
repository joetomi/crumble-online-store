import { NextResponse } from "next/server";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { validateContent } from "@/lib/store-content";

type GithubFile = { sha?: string };

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
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
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "crumble-store-admin",
    };
    const currentResponse = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, {
      headers,
      cache: "no-store",
    });
    const currentFile = (await currentResponse.json().catch(() => ({}))) as GithubFile;

    if (!currentResponse.ok || !currentFile.sha) {
      return NextResponse.json({ success: false, error: "تعذر قراءة ملف المتجر من GitHub." }, { status: 502 });
    }

    const json = `${JSON.stringify(body, null, 2)}\n`;
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
    const result = (await updateResponse.json().catch(() => ({}))) as { commit?: { sha?: string } };

    if (!updateResponse.ok || !result.commit?.sha) {
      return NextResponse.json({ success: false, error: "رفض GitHub التحديث. تحقق من صلاحية الربط." }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "تم رفع التغييرات إلى GitHub، وبدأ Vercel إعادة إطلاق الموقع.",
      pushed: true,
      commit: result.commit.sha,
    });
  } catch (error) {
    console.error("Admin publish failed", error);
    return NextResponse.json({ success: false, error: "تعذر نشر التغييرات حالياً." }, { status: 500 });
  }
}
