"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { defaultContent, readLocalContent } from "@/lib/store-content";
import { getStoreStatus } from "@/lib/store-status";
import type { CartBox, OrderMode, Product, StoreContent } from "@/lib/types";
import { clearCartSession, loadCartSession, saveCartSession } from "@/lib/cart-session";
import { BoxBuilder } from "./box-builder";
import { OrderSheet } from "./order-sheet";
import { ProductGrid } from "./product-grid";
import { StoriesCarousel } from "./stories-carousel";

export function Storefront() {
  const [content, setContent] = useState<StoreContent>(defaultContent);
  const [mode, setMode] = useState<Exclude<OrderMode, "mixed">>("pieces");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [boxes, setBoxes] = useState<CartBox[]>([]);
  const [boxItems, setBoxItems] = useState<string[]>([]);
  const [activeBoxId, setActiveBoxId] = useState(defaultContent.boxes.find((box) => box.enabled)?.id ?? "");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [pendingBoxId, setPendingBoxId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [, setClock] = useState(0);

  useEffect(() => {
    const sync = () => setContent(readLocalContent());
    sync();
    const savedCart = loadCartSession();
    if (savedCart) {
      setQuantities(savedCart.quantities);
      setBoxes(savedCart.boxes ?? []);
    }
    setCartLoaded(true);
    window.addEventListener("storage", sync);
    window.addEventListener("crumble-content-updated", sync);
    const timer = window.setInterval(() => setClock((value) => value + 1), 60_000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("crumble-content-updated", sync);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    const hasPieces = Object.values(quantities).some((quantity) => quantity > 0);
    if (!hasPieces && boxes.length === 0) {
      clearCartSession();
      return;
    }
    saveCartSession({
      mode: hasPieces && boxes.length ? "mixed" : boxes.length ? "box" : "pieces",
      quantities,
      boxes,
    });
  }, [cartLoaded, quantities, boxes]);

  useEffect(() => {
    if (!builderOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [builderOpen]);

  const products = useMemo(() => content.products.filter((product) => product.available), [content.products]);
  const stories = content.stories?.filter((story) => story.enabled) ?? [];
  const enabledBoxes = content.boxes.filter((box) => box.enabled);
  const activeBox = enabledBoxes.find((box) => box.id === activeBoxId) ?? enabledBoxes[0] ?? content.boxes[0];
  const storeStatus = getStoreStatus(content.store);
  const pieceCount = Object.values(quantities).reduce((total, quantity) => total + quantity, 0);

  const totalPiecesPrice = useMemo(() => {
    let total = 0;
    for (const [id, qty] of Object.entries(quantities)) {
      if (qty > 0) {
        const prod = products.find((p) => p.id === id);
        if (prod && prod.price !== null) {
          total += prod.price * qty;
        }
      }
    }
    return total;
  }, [quantities, products]);

  function addPiece(product: Product) {
    setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
  }

  function removePiece(product: Product) {
    setQuantities((current) => ({ ...current, [product.id]: Math.max((current[product.id] ?? 0) - 1, 0) }));
  }

  function switchBox(id: string) {
    if (id === activeBox?.id) return;
    if (boxItems.length > 0) {
      setPendingBoxId(id);
      setDiscardConfirmOpen(true);
      return;
    }
    setActiveBoxId(id);
  }

  function selectMode(nextMode: Exclude<OrderMode, "mixed">) {
    setMode(nextMode);
    if (nextMode === "box") setBuilderOpen(true);
    document.querySelector("#flavours")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openBuilder() {
    setBoxItems([]);
    setBuilderOpen(true);
  }

  function closeBuilder() {
    setBuilderOpen(false);
    setDiscardConfirmOpen(false);
    setPendingBoxId(null);
    setBoxItems([]);
  }

  function attemptCloseBuilder() {
    if (boxItems.length > 0) {
      setPendingBoxId(null);
      setDiscardConfirmOpen(true);
      return;
    }
    closeBuilder();
  }

  function discardDraft() {
    if (pendingBoxId) {
      setActiveBoxId(pendingBoxId);
      setPendingBoxId(null);
      setDiscardConfirmOpen(false);
      setBoxItems([]);
      return;
    }
    closeBuilder();
  }

  function addBoxToCart() {
    if (!activeBox || boxItems.length !== activeBox.capacity) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `box-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBoxes((current) => [...current, { id, boxId: activeBox.id, items: [...boxItems] }]);
    closeBuilder();
  }

  function newOrder() {
    setQuantities({});
    setBoxes([]);
    setBoxItems([]);
    setSheetOpen(false);
  }

  function removeCartPiece(id: string) {
    setQuantities((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function removeCartBox(id: string) {
    setBoxes((current) => current.filter((box) => box.id !== id));
  }

  function clearCart() {
    setQuantities({});
    setBoxes([]);
    setBoxItems([]);
    setSheetOpen(false);
  }

  return (
    <main className="cr-profile" id="top">
      <header className="cr-profile-head">
        <div className="cr-logo-circle">
          <img src={content.brand.logo} alt="شعار Crumble" />
        </div>
        <div className="cr-brand-name" dir="ltr">
          <b>CRUMBLE</b>
          <span>{content.brand.slogan}</span>
        </div>
        <p>{content.brand.heroText}</p>
        <div className={`cr-open-state ${storeStatus.isOpen ? "is-open" : ""}`}>
          <i aria-hidden="true" />
          <span>{storeStatus.title}</span>
        </div>
      </header>

      {stories.length > 0 && <StoriesCarousel stories={stories} />}

      <section className="cr-about-card" aria-labelledby="about-title">
        <span>عن Crumble</span>
        <h1 id="about-title">{content.brand.heroTitle}</h1>
        <p>نخبزها طازجة، ونترك لك اختيار النكهة والطريقة التي تناسب مزاجك.</p>
        <a href="#order">طلب الآن <span aria-hidden="true">←</span></a>
      </section>

      {!storeStatus.isOpen && (
        <section className="cr-closed-card">
          <b>{storeStatus.title}</b>
          <p>{storeStatus.description}</p>
        </section>
      )}

      <section className="cr-order-card" id="order" aria-labelledby="order-title">
        <div className="cr-section-title">
          <span>اختيارك، بطريقتك</span>
          <h2 id="order-title">كيف تبي تطلب؟</h2>
        </div>

        <div className="cr-mode-cards" role="tablist" aria-label="نوع الطلب">
          <button type="button" role="tab" aria-selected={mode === "pieces"} className={mode === "pieces" ? "is-active" : ""} onClick={() => selectMode("pieces")}>
            <b>طلب بالقطعة</b>
            <small>اختر أي نكهة بالعدد</small>
          </button>
          <button type="button" role="tab" aria-selected={mode === "box"} className={mode === "box" ? "is-active" : ""} onClick={() => selectMode("box")}>
            <b>بوكس Crumble</b>
            <small>رتّب البوكس على مزاجك</small>
          </button>
        </div>

        <div className="cr-selection" id="flavours" key={mode}>
          {mode === "pieces" ? (
            <>
              <div className="cr-selection-head">
                <div><span>اختر نكهتك</span><b>الكوكيز الطازجة</b></div>
                {pieceCount > 0 && <strong>{pieceCount} قطع</strong>}
              </div>
              <ProductGrid products={products} quantities={quantities} onAdd={addPiece} onRemove={removePiece} mode="pieces" currency={content.store.currency} />
              {pieceCount > 0 && (
                <div className="cr-review-card">
                  <div>
                    <span>مجموع الطلب ({pieceCount} {pieceCount === 1 ? "قطعة" : "قطع"})</span>
                    <b dir="ltr">{totalPiecesPrice > 0 ? `${totalPiecesPrice} ${content.store.currency}` : `${pieceCount} قطع`}</b>
                  </div>
                  <button type="button" disabled={!storeStatus.isOpen} onClick={() => setSheetOpen(true)}>مراجعة الطلب</button>
                </div>
              )}
            </>
          ) : activeBox ? (
            <div className="cr-box-launcher">
              <span>كوّن بوكسك بشكل منفصل ثم أضفه للسلة</span>
              <b>{boxes.length ? `${boxes.length} بوكس في السلة` : "اختر الحجم والنكهات على مزاجك"}</b>
              <button type="button" disabled={!storeStatus.isOpen} onClick={openBuilder}>تكوين بوكس جديد</button>
            </div>
          ) : (
            <p className="cr-empty">لا يوجد بوكس متاح حالياً.</p>
          )}
        </div>
      </section>

      <footer className="cr-profile-footer">
        <div dir="ltr"><b>CRUMBLE</b><span>{content.brand.slogan}</span></div>
        <a href="/admin">إدارة المتجر</a>
      </footer>

      {/* Floating Cart Button at Bottom Left */}
      {(pieceCount > 0 || boxes.length > 0) && (
        <button
          type="button"
          className="cr-fab-cart"
          onClick={() => setSheetOpen(true)}
          title="معاينة السلة وإكمال الطلب"
          aria-label="السلة"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span className="cr-fab-badge">{pieceCount + boxes.length}</span>
        </button>
      )}

      {builderOpen && activeBox && (
        <div className="box-builder-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && attemptCloseBuilder()}>
          <section className="box-builder-modal" role="dialog" aria-modal="true" aria-labelledby="box-builder-title">
            <div className="box-builder-modal-head">
              <div><span>تكوين بوكس</span><h2 id="box-builder-title">اختياراتك في بوكس مستقل</h2></div>
              <button type="button" onClick={attemptCloseBuilder} aria-label="إغلاق تكوين البوكس">×</button>
            </div>
            <BoxBuilder content={content} box={activeBox} items={boxItems} onChange={setBoxItems} onBoxChange={switchBox} onConfirm={addBoxToCart} canOrder={storeStatus.isOpen} confirmLabel="إضافة البوكس للسلة" />
          </section>
          {discardConfirmOpen && (
            <div className="box-discard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="discard-box-title">
              <h3 id="discard-box-title">{pendingBoxId ? "تغيير حجم البوكس؟" : boxItems.length === activeBox.capacity ? "البوكس لم يُضف للسلة" : "البوكس لم يكتمل"}</h3>
              <p>{pendingBoxId ? "سيتم حذف اختيارات هذا البوكس عند تغيير حجمه." : "هل تريد الخروج؟ سيتم حذف اختيارات هذا البوكس."}</p>
              <div><button type="button" onClick={() => { setDiscardConfirmOpen(false); setPendingBoxId(null); }}>العودة للبوكس</button><button type="button" className="is-danger" onClick={discardDraft}>{pendingBoxId ? "تغيير وحذف" : "خروج وحذف"}</button></div>
            </div>
          )}
        </div>
      )}

      {sheetOpen && (
        <OrderSheet
          content={content}
          quantities={quantities}
          boxes={boxes}
          onClose={() => setSheetOpen(false)}
          onNewOrder={newOrder}
          onRemovePiece={removeCartPiece}
          onRemoveBox={removeCartBox}
          onClearCart={clearCart}
        />
      )}
    </main>
  );
}
