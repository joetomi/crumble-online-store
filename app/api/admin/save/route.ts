import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { validateContent } from "@/lib/store-content";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!validateContent(body)) {
      return NextResponse.json({ success: false, error: "محتوى غير صالح" }, { status: 400 });
    }

    // Path to data/store.json
    const filePath = path.join(process.cwd(), "data", "store.json");
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf-8");

    return NextResponse.json({ success: true, message: "تم حفظ التعديلات بنجاح" });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ success: false, error: "فشل حفظ البيانات" }, { status: 500 });
  }
}
