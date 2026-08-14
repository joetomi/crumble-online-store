/* eslint-disable @next/next/no-img-element */
import type { StoreContent } from "@/lib/types";

export function BrandHeader({ brand }: { brand: StoreContent["brand"] }) {
  return (
    <header className="cr-header">
      <a className="cr-brand" href="#top" aria-label="Crumble — الرئيسية">
        <img src={brand.logo} alt="" width="46" height="46" />
        <span><b>CRUMBLE</b><small dir="ltr">{brand.slogan}</small></span>
      </a>
      <nav aria-label="التنقل الرئيسي">
        <a className="cr-admin-link" href="/admin">الإدارة</a>
        <a className="cr-header-cta" href="#order">ابدأ طلبك</a>
      </nav>
    </header>
  );
}
