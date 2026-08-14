"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { defaultContent, readLocalContent } from "@/lib/store-content";
import { getStoreStatus } from "@/lib/store-status";
import type { OrderMode, Product, StoreContent } from "@/lib/types";
import { BrandHeader } from "./brand-header";
import { BoxBuilder } from "./box-builder";
import { OrderSheet } from "./order-sheet";
import { ProductGrid } from "./product-grid";

export function Storefront() {
  const [content, setContent] = useState<StoreContent>(defaultContent);
  const [mode, setMode] = useState<OrderMode>("pieces");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [boxItems, setBoxItems] = useState<string[]>([]);
  const [activeBoxId, setActiveBoxId] = useState(defaultContent.boxes.find((box) => box.enabled)?.id ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, setClock] = useState(0);

  useEffect(() => {
    const sync = () => setContent(readLocalContent());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("crumble-content-updated", sync);
    const timer = window.setInterval(() => setClock((value) => value + 1), 60_000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("crumble-content-updated", sync);
      window.clearInterval(timer);
    };
  }, []);

  const products = useMemo(() => content.products.filter((product) => product.available), [content.products]);
  const enabledBoxes = content.boxes.filter((box) => box.enabled);
  const activeBox = enabledBoxes.find((box) => box.id === activeBoxId) ?? enabledBoxes[0] ?? content.boxes[0];
  const storeStatus = getStoreStatus(content.store);
  const pieceCount = Object.values(quantities).reduce((total, quantity) => total + quantity, 0);
  const featured = products.slice(0, 3);

  function addPiece(product: Product) {
    setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
  }
  function removePiece(product: Product) {
    setQuantities((current) => ({ ...current, [product.id]: Math.max((current[product.id] ?? 0) - 1, 0) }));
  }
  function switchBox(id: string) { setActiveBoxId(id); setBoxItems([]); }
  function newOrder() {
    if (mode === "pieces") setQuantities({}); else setBoxItems([]);
    setSheetOpen(false);
  }

  return (
    <main className="cr-storefront" id="top">
      <BrandHeader brand={content.brand} />

      <section className="cr-hero" aria-labelledby="hero-title">
        <div className="cr-hero-copy">
          <span className="cr-kicker" dir="ltr">FRESHLY BAKED · CRUMBLE</span>
          <h1 id="hero-title">{content.brand.heroTitle}</h1>
          <p>{content.brand.heroText}</p>
          <div className="cr-hero-actions">
            <a href="#order">اختار نكهتك <span aria-hidden="true">←</span></a>
            <div className={`cr-status ${storeStatus.isOpen ? "is-open" : ""}`}><i aria-hidden="true" />{storeStatus.title}</div>
          </div>
        </div>

        <div className="cr-hero-gallery" aria-label="نكهات Crumble المميزة">
          {featured[0] && (
            <figure className="cr-hero-main-photo">
              <img src={featured[0].image} alt={featured[0].name} />
              <figcaption><span>الأكثر طلبًا</span><b dir="ltr">{featured[0].name}</b></figcaption>
            </figure>
          )}
          <div className="cr-hero-side-photos">
            {featured.slice(1).map((product) => (
              <figure key={product.id}><img src={product.image} alt={product.name} /><figcaption dir="ltr">{product.name}</figcaption></figure>
            ))}
          </div>
          <div className="cr-flavour-count"><b>{products.length}</b><span>نكهات<br />على مزاجك</span></div>
        </div>
      </section>

      <section className="cr-values" aria-label="مميزات Crumble">
        <div><b>01</b><span>تُخبز طازجة</span><small>دفعات يومية بطعم واضح</small></div>
        <div><b>02</b><span>اختيارك بالكامل</span><small>بالقطعة أو داخل بوكسك</small></div>
        <div><b>03</b><span>جاهزة للمشاركة</span><small>تغليف Crumble المميز</small></div>
      </section>

      {!storeStatus.isOpen && <section className="cr-closed"><span>تقدر تتفرج وتختار</span><h2>{storeStatus.title}</h2><p>{storeStatus.description}</p></section>}

      <section className="cr-order" id="order" aria-labelledby="order-title">
        <div className="cr-order-head">
          <div><span className="cr-kicker">اختيارك، بطريقتك</span><h2 id="order-title">كيف تبي تطلب؟</h2><p>اختار نكهاتك قطعة بقطعة، أو كوّن بوكس Crumble كامل على مزاجك.</p></div>
          <div className="cr-mode-switch" role="tablist" aria-label="طريقة الطلب">
            <button type="button" role="tab" aria-selected={mode === "pieces"} className={mode === "pieces" ? "is-active" : ""} onClick={() => setMode("pieces")}>بالقطعة</button>
            <button type="button" role="tab" aria-selected={mode === "box"} className={mode === "box" ? "is-active" : ""} onClick={() => setMode("box")}>بالبوكس</button>
          </div>
        </div>

        <div className="cr-mode-content" key={mode}>
          {mode === "pieces" ? (
            <div>
              <ProductGrid products={products} quantities={quantities} onAdd={addPiece} onRemove={removePiece} mode="pieces" />
              {pieceCount > 0 && (
                <div className="cr-order-summary">
                  <div><span>طلبك الحالي</span><b>{pieceCount} {pieceCount === 1 ? "قطعة" : "قطع"}</b></div>
                  <button type="button" disabled={!storeStatus.isOpen} onClick={() => setSheetOpen(true)}>راجع وأكّد الطلب <span aria-hidden="true">←</span></button>
                </div>
              )}
            </div>
          ) : activeBox ? (
            <BoxBuilder content={content} box={activeBox} items={boxItems} onChange={setBoxItems} onBoxChange={switchBox} onConfirm={() => setSheetOpen(true)} canOrder={storeStatus.isOpen} />
          ) : <p className="cr-empty">لا يوجد بوكس متاح حاليًا.</p>}
        </div>
      </section>

      <section className="cr-signoff">
        <img src={content.brand.logo} alt="شعار Crumble" />
        <div><span dir="ltr">{content.brand.slogan}</span><h2>كل مزاج له نكهة.</h2></div>
        <a href="#order">اطلب الآن</a>
      </section>

      <footer className="cr-footer">
        <div><b>CRUMBLE</b><span dir="ltr">{content.brand.slogan}</span></div>
        <p>كوكيز طازجة تُحضّر على مزاجك.</p>
        <nav>{Object.entries(content.store.social).map(([name, url]) => url && <a key={name} href={url}>{name}</a>)}<a href="/admin">إدارة المتجر</a></nav>
      </footer>

      {sheetOpen && activeBox && <OrderSheet content={content} mode={mode} quantities={quantities} boxItems={boxItems} box={activeBox} onClose={() => setSheetOpen(false)} onNewOrder={newOrder} />}
    </main>
  );
}
