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

  const products = useMemo(
    () => content.products.filter((product) => product.available),
    [content.products],
  );
  const enabledBoxes = content.boxes.filter((box) => box.enabled);
  const activeBox = enabledBoxes.find((box) => box.id === activeBoxId) ?? enabledBoxes[0] ?? content.boxes[0];
  const storeStatus = getStoreStatus(content.store);
  const pieceCount = Object.values(quantities).reduce((total, quantity) => total + quantity, 0);

  function addPiece(product: Product) {
    setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
  }

  function removePiece(product: Product) {
    setQuantities((current) => ({ ...current, [product.id]: Math.max((current[product.id] ?? 0) - 1, 0) }));
  }

  function switchBox(id: string) {
    setActiveBoxId(id);
    setBoxItems([]);
  }

  function newOrder() {
    if (mode === "pieces") setQuantities({});
    else setBoxItems([]);
    setSheetOpen(false);
  }

  const featured = products.slice(0, 4);

  return (
    <main id="top">
      <BrandHeader brand={content.brand} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="brand-kicker" dir="ltr">{content.brand.slogan}</span>
          <h1 id="hero-title">{content.brand.heroTitle}</h1>
          <p>{content.brand.heroText}</p>
          <a className="hero-action" href="#order">كوّن طلبك <span aria-hidden="true">←</span></a>
          <div className={`store-pill ${storeStatus.isOpen ? "is-open" : "is-closed"}`}>
            <span aria-hidden="true" />
            {storeStatus.title}
          </div>
        </div>
        <div className="hero-visual" aria-label="تشكيلة من كوكيز Crumble">
          <div className="hero-stamp">
            <img src={content.brand.logo} alt="شعار Crumble" />
          </div>
          {featured.map((product, index) => (
            <figure className={`hero-cookie hero-cookie--${index + 1}`} key={product.id}>
              <img src={product.image} alt={product.name} />
            </figure>
          ))}
          <span className="hero-note">Baked to<br />change moods</span>
        </div>
      </section>

      {!storeStatus.isOpen && (
        <section className="closed-banner" aria-label="حالة استقبال الطلبات">
          <span className="eyebrow">تقدر تتفرج وتختار</span>
          <h2>{storeStatus.title}</h2>
          <p>{storeStatus.description}</p>
        </section>
      )}

      <section className="order-section" id="order" aria-labelledby="order-title">
        <div className="order-heading">
          <div className="section-intro">
            <span className="eyebrow">اختيارك، بطريقتك</span>
            <h2 id="order-title">كيف تبي تطلب؟</h2>
            <p>اختار قطعك واحدة واحدة، أو عبّي بوكس Crumble على مزاجك.</p>
          </div>
          <div className="mode-switch" role="tablist" aria-label="طريقة الطلب">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "pieces"}
              className={mode === "pieces" ? "is-active" : ""}
              onClick={() => setMode("pieces")}
            >
              بالقطعة
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "box"}
              className={mode === "box" ? "is-active" : ""}
              onClick={() => setMode("box")}
            >
              بالبوكس
            </button>
          </div>
        </div>

        <div className="mode-content" key={mode}>
          {mode === "pieces" ? (
            <div className="pieces-experience">
              <ProductGrid
                products={products}
                quantities={quantities}
                onAdd={addPiece}
                onRemove={removePiece}
                mode="pieces"
              />
              <div className={`sticky-summary ${pieceCount > 0 ? "is-visible" : ""}`}>
                <div>
                  <span>اختياراتك</span>
                  <b>{pieceCount === 0 ? "ابدأ باختيار نكهتك" : `${pieceCount} ${pieceCount === 1 ? "قطعة مختارة" : "قطع مختارة"}`}</b>
                </div>
                <button
                  type="button"
                  className="primary-action"
                  disabled={pieceCount === 0 || !storeStatus.isOpen}
                  onClick={() => setSheetOpen(true)}
                >
                  تأكيد الطلب
                </button>
              </div>
            </div>
          ) : activeBox ? (
            <BoxBuilder
              content={content}
              box={activeBox}
              items={boxItems}
              onChange={setBoxItems}
              onBoxChange={switchBox}
              onConfirm={() => setSheetOpen(true)}
              canOrder={storeStatus.isOpen}
            />
          ) : (
            <p className="empty-state">لا يوجد بوكس متاح حالياً.</p>
          )}
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <b>CRUMBLE</b>
          <span dir="ltr">{content.brand.slogan}</span>
        </div>
        <div className="social-links">
          {Object.entries(content.store.social).map(([name, url]) => url && <a key={name} href={url}>{name}</a>)}
        </div>
        <a href="/admin" className="footer-admin">إدارة محتوى المتجر</a>
      </footer>

      {sheetOpen && activeBox && (
        <OrderSheet
          content={content}
          mode={mode}
          quantities={quantities}
          boxItems={boxItems}
          box={activeBox}
          onClose={() => setSheetOpen(false)}
          onNewOrder={newOrder}
        />
      )}
    </main>
  );
}
