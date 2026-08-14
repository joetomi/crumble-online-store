"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef } from "react";
import { animateCookieToSlot } from "@/lib/animations";
import type { BoxSize, Product, StoreContent } from "@/lib/types";
import { ProductGrid } from "./product-grid";

type BoxBuilderProps = {
  content: StoreContent;
  box: BoxSize;
  items: string[];
  onChange: (items: string[]) => void;
  onBoxChange: (id: string) => void;
  onConfirm: () => void;
  canOrder: boolean;
};

export function BoxBuilder({
  content,
  box,
  items,
  onChange,
  onBoxChange,
  onConfirm,
  canOrder,
}: BoxBuilderProps) {
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const products = content.products.filter((product) => product.available);
  const productMap = useMemo(
    () => new Map(content.products.map((product) => [product.id, product])),
    [content.products],
  );
  const quantities = items.reduce<Record<string, number>>((result, id) => {
    result[id] = (result[id] ?? 0) + 1;
    return result;
  }, {});
  const isFull = items.length >= box.capacity;
  const enabledBoxes = content.boxes.filter((entry) => entry.enabled);

  function addProduct(product: Product, source: HTMLElement) {
    if (isFull) return;
    const target = slotRefs.current[items.length];
    if (target) animateCookieToSlot(source, target, product.image);
    onChange([...items, product.id]);
  }

  function removeLast(product: Product) {
    const index = items.lastIndexOf(product.id);
    if (index < 0) return;
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeSlot(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="box-experience">
      <div className="box-stage-wrap">
        <div className="box-stage-heading">
          <div>
            <span className="eyebrow">كوّن بوكسك</span>
            <h2 dir="ltr">{box.name}</h2>
          </div>
          <div className={`box-counter ${isFull ? "is-complete" : ""}`} aria-live="polite" dir="ltr">
            {items.length}/{box.capacity}
          </div>
        </div>

        {enabledBoxes.length > 1 && (
          <div className="box-size-picker" aria-label="اختر حجم البوكس">
            {enabledBoxes.map((entry) => (
              <button
                type="button"
                className={entry.id === box.id ? "is-active" : ""}
                onClick={() => onBoxChange(entry.id)}
                key={entry.id}
              >
                {entry.name}
              </button>
            ))}
          </div>
        )}

        <div className="premium-box" aria-label={`${box.name}: ${items.length} من ${box.capacity}`}>
          <div className="box-lid">
            <span>CRUMBLE</span>
            <small>Crunch your mood!</small>
          </div>
          <div className="box-base">
            <div className="box-liner" style={{ backgroundImage: `url(${content.brand.linerImage})` }} />
            <div className={`box-slots box-slots--${Math.min(box.capacity, 8)}`}>
              {Array.from({ length: box.capacity }).map((_, index) => {
                const product = items[index] ? productMap.get(items[index]) : undefined;
                return (
                  <button
                    className={`box-slot ${product ? "is-filled" : ""}`}
                    type="button"
                    key={`${index}-${product?.id ?? "empty"}`}
                    ref={(node) => {
                      slotRefs.current[index] = node;
                    }}
                    aria-label={product ? `إزالة ${product.name} من البوكس` : `المكان ${index + 1} فارغ`}
                    onClick={() => product && removeSlot(index)}
                  >
                    {product ? (
                      <img
                        src={product.image}
                        alt=""
                        style={{ "--slot-rotation": `${[-4, 3, -2, 5][index % 4]}deg` } as React.CSSProperties}
                      />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="box-wordmark">CRUMBLE</div>
          </div>
        </div>

        <div className="box-summary-line">
          <div>
            <b>{isFull ? "بوكسك جاهز" : `باقي ${box.capacity - items.length} قطع`}</b>
            <span>{box.description}</span>
          </div>
          <strong dir="ltr">{box.price} {content.store.currency}</strong>
        </div>

        {items.length > 0 && (
          <button className="clear-box" type="button" onClick={() => onChange([])}>
            إفراغ البوكس
          </button>
        )}
        {isFull && (
          <button className="primary-action complete-action" type="button" onClick={onConfirm} disabled={!canOrder}>
            تأكيد الطلب
          </button>
        )}
      </div>

      <div className="box-flavours">
        <div className="section-intro section-intro--compact">
          <span className="eyebrow">اختياراتك</span>
          <h2>{isFull ? "بوكسك اكتمل" : "اضغط على النكهة لإضافتها"}</h2>
          <p>{isFull ? "يمكنك إزالة أي قطعة من داخل البوكس وتغييرها." : "تقدر تكرر نفس النكهة أكثر من مرة."}</p>
        </div>
        <ProductGrid
          products={products}
          quantities={quantities}
          disabled={isFull}
          onAdd={addProduct}
          onRemove={removeLast}
          mode="box"
        />
      </div>
    </div>
  );
}
