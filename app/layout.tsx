import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./storefront.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "Crumble | Crunch your mood!";
  const description = "كوكيز Crumble الطازجة — اختر نكهاتك بالقطعة أو كوّن بوكسك الخاص.";

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: "/brand/crumble-logo.png",
      shortcut: "/brand/crumble-logo.png",
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ar_LY",
      images: [{ url: "/og.png", width: 1400, height: 700, alt: "Crumble — Crunch your mood!" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
