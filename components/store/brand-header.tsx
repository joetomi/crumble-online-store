/* eslint-disable @next/next/no-img-element */
import type { StoreContent } from "@/lib/types";

export function BrandHeader({ brand }: { brand: StoreContent["brand"] }) {
  return (
    <header className="site-header">
      <a className="header-brand" href="#top" aria-label="Crumble — الرئيسية">
        <img src={brand.logo} alt="" width="44" height="44" />
        <span>
          <b>CRUMBLE</b>
          <small>{brand.slogan}</small>
        </span>
      </a>
      <nav aria-label="التنقل الرئيسي">
        <a href="#order">اطلب الآن</a>
        <a href="/admin">لوحة التحكم</a>
      </nav>
    </header>
  );
}
