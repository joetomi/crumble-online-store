"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo } from "react";
import type { BoxSize, Product, StoreContent } from "@/lib/types";
import { COOKIE_TYPE_LABELS, normalizeAllowedCookieTypes, normalizeCookieType } from "@/lib/types";
import { ProductGrid } from "./product-grid";

type BoxBuilderProps = {
  content: StoreContent;
  box: BoxSize;
  items: string[];
  onChange: (items: string[]) => void;
  onBoxChange: (id: string) => void;
  onConfirm: () => void;
  canOrder: boolean;
  confirmLabel?: string;
};

export function BoxBuilder({ content, box, items, onChange, onBoxChange, onConfirm, canOrder, confirmLabel = "إضافة للسلة" }: BoxBuilderProps) {
  const allowedCookieTypes = normalizeAllowedCookieTypes(box.allowedCookieTypes);
  const products = content.products.filter(
    (product) => product.available && allowedCookieTypes.includes(normalizeCookieType(product.cookieType)),
  );
  const productMap = useMemo(() => new Map(content.products.map((product) => [product.id, product])), [content.products]);
  const quantities = items.reduce<Record<string, number>>((result, id) => {
    result[id] = (result[id] ?? 0) + 1;
    return result;
  }, {});
  const isFull = items.length >= box.capacity;
  const enabledBoxes = content.boxes.filter((entry) => entry.enabled);

  function addProduct(product: Product) {
    if (!isFull) onChange([...items, product.id]);
  }

  function removeLast(product: Product) {
    const index = items.lastIndexOf(product.id);
    if (index >= 0) onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="cr-box-builder">
      <section className="cr-box-card" aria-label={`تجهيز ${box.name}`}>
        <div className="cr-box-topline">
          <div><span>كوّن بوكسك</span><b dir="ltr">{box.name}</b></div>
          <strong className={isFull ? "is-full" : ""} dir="ltr">{items.length}/{box.capacity}</strong>
        </div>

        {enabledBoxes.length > 1 && (
          <div className="cr-box-sizes" aria-label="حجم البوكس">
            {enabledBoxes.map((entry) => (
              <button type="button" className={entry.id === box.id ? "is-active" : ""} onClick={() => onBoxChange(entry.id)} key={entry.id}>
                <b dir="ltr">{entry.name}</b><span>{entry.capacity} قطع</span>
              </button>
            ))}
          </div>
        )}

        <div className="cr-box-slots" style={{ "--slot-count": Math.min(box.capacity, 4) } as React.CSSProperties}>
          {Array.from({ length: box.capacity }).map((_, index) => {
            const product = items[index] ? productMap.get(items[index]) : undefined;
            return (
              <button
                className={product ? "is-filled" : ""}
                type="button"
                key={`${index}-${product?.id ?? "empty"}`}
                aria-label={product ? `إزالة ${product.name} من البوكس` : `المكان ${index + 1} فارغ`}
                onClick={() => product && onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                {product ? <img src={product.image} alt="" /> : <span>{index + 1}</span>}
              </button>
            );
          })}
        </div>

        <div className="cr-box-note">
          <div>
            <b>{isFull ? "بوكسك جاهز" : `باقي ${box.capacity - items.length} قطع`}</b>
            <span>{box.description}</span>
            <small>يقبل: {allowedCookieTypes.map((type) => COOKIE_TYPE_LABELS[type]).join("، ")}</small>
          </div>
          <strong dir="ltr">{box.price} {content.store.currency}</strong>
        </div>

        <div className="cr-box-buttons">
          {items.length > 0 && <button type="button" onClick={() => onChange([])}>إفراغ</button>}
          <button type="button" className="cr-box-confirm" disabled={!isFull || !canOrder} onClick={onConfirm}>
            {isFull ? confirmLabel : "أكمل اختيارك"}
          </button>
        </div>
      </section>

      <section className="cr-box-flavours">
        <div className="cr-selection-head">
          <div><span>نكهات البوكس</span><b>{isFull ? "اكتمل البوكس" : "اضغط لإضافة النكهة"}</b></div>
          <strong>{items.length}/{box.capacity}</strong>
        </div>
        {products.length ? (
          <ProductGrid products={products} quantities={quantities} disabled={isFull} onAdd={addProduct} onRemove={removeLast} mode="box" currency={content.store.currency} />
        ) : (
          <p className="cr-empty">لا توجد نكهات متاحة من النوع المسموح لهذا البوكس حالياً.</p>
        )}
      </section>
    </div>
  );
}
