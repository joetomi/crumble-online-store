import { NextResponse } from "next/server";
import { adminSessionCookie, createAdminSession, hasValidAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: await hasValidAdminSession(request) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !verifyAdminPassword(body.password)) {
    return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", adminSessionCookie(await createAdminSession(), request));
  return response;
}
