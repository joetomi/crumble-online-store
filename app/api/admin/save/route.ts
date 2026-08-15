import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { validateContent } from "@/lib/store-content";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!validateContent(body)) {
      return NextResponse.json({ success: false, error: "محتوى غير صالح" }, { status: 400 });
    }

    const jsonString = JSON.stringify(body, null, 2);
    const filePath = path.join(process.cwd(), "data", "store.json");

    // 1. Write updated JSON to data/store.json
    fs.writeFileSync(filePath, jsonString, "utf-8");

    let pushedToGithub = false;

    // 2. If GITHUB_TOKEN is available, commit directly via GitHub API
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const repoOwner = "joetomi";
    const repoName = "crumble-online-store";
    const filePathInRepo = "data/store.json";

    if (token) {
      try {
        const getFileRes = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePathInRepo}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Next.js-Admin-Save",
            },
          },
        );
        const fileData = (await getFileRes.json()) as { sha?: string };

        if (fileData?.sha) {
          const putRes = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePathInRepo}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "Next.js-Admin-Save",
              },
              body: JSON.stringify({
                message: "تعديل من الادارة",
                content: Buffer.from(jsonString).toString("base64"),
                sha: fileData.sha,
              }),
            },
          );

          if (putRes.ok) {
            pushedToGithub = true;
          }
        }
      } catch (ghErr) {
        console.error("GitHub API commit error:", ghErr);
      }
    }

    // 3. Fallback: If running in local Node environment, use git CLI
    if (!pushedToGithub) {
      try {
        await execAsync(`git add data/store.json && git commit -m "تعديل من الادارة" && git push`);
        pushedToGithub = true;
      } catch (cliErr) {
        console.log("Local git push notice:", cliErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: pushedToGithub
        ? "تم حفظ التغييرات وإعادة الإطلاق على Vercel بنجاح!"
        : "تم حفظ التغييرات بنجاح!",
      pushed: pushedToGithub,
    });
  } catch (error) {
    console.error("Save endpoint error:", error);
    return NextResponse.json({ success: false, error: "فشل حفظ التغييرات" }, { status: 500 });
  }
}
