"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef } from "react";
import { animateCookieToSlot } from "@/lib/animations";
import type { BoxSize, Product, StoreContent } from "@/lib/types";
import { ProductGrid } from "./product-grid";

type BoxBuilderProps = { content: StoreContent; box: BoxSize; items: string[]; onChange: (items: string[]) => void; onBoxChange: (id: string) => void; onConfirm: () => void; canOrder: boolean; };

export function BoxBuilder({ content, box, items, onChange, onBoxChange, onConfirm, canOrder }: BoxBuilderProps) {
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const products = content.products.filter((product) => product.available);
  const productMap = useMemo(() => new Map(content.products.map((product) => [product.id, product])), [content.products]);
  const quantities = items.reduce<Record<string, number>>((result, id) => { result[id] = (result[id] ?? 0) + 1; return result; }, {});
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
    if (index >= 0) onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="cr-box-layout">
      <aside className="cr-box-panel">
        <div className="cr-box-heading">
          <div><span className="cr-kicker">كوّن بوكسك</span><h2 dir="ltr">{box.name}</h2></div>
          <strong className={isFull ? "is-full" : ""} dir="ltr">{items.length}/{box.capacity}</strong>
        </div>
        {enabledBoxes.length > 1 && <div className="cr-box-sizes">{enabledBoxes.map((entry) => <button type="button" className={entry.id === box.id ? "is-active" : ""} onClick={() => onBoxChange(entry.id)} key={entry.id}>{entry.name}</button>)}</div>}

        <div className="cr-box-preview" aria-label={`${box.name}: ${items.length} من ${box.capacity}`}>
          <div className="cr-box-lid"><b>CRUMBLE</b><span>Crunch your mood!</span></div>
          <div className="cr-box-base">
            <div className="cr-box-liner" style={{ backgroundImage: `url(${content.brand.linerImage})` }} />
            <div className={`cr-box-slots cr-box-slots--${Math.min(box.capacity, 8)}`}>
              {Array.from({ length: box.capacity }).map((_, index) => {
                const product = items[index] ? productMap.get(items[index]) : undefined;
                return (
                  <button className={product ? "is-filled" : ""} type="button" key={`${index}-${product?.id ?? "empty"}`} ref={(node) => { slotRefs.current[index] = node; }} aria-label={product ? `إزالة ${product.name} من البوكس` : `المكان ${index + 1} فارغ`} onClick={() => product && onChange(items.filter((_, itemIndex) => itemIndex !== index))}>
                    {product ? <img src={product.image} alt="" /> : <span>{index + 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="cr-box-total"><div><b>{isFull ? "بوكسك جاهز" : `باقي ${box.capacity - items.length} قطع`}</b><span>{box.description}</span></div><strong dir="ltr">{box.price} {content.store.currency}</strong></div>
        <div className="cr-box-actions">
          {items.length > 0 && <button type="button" onClick={() => onChange([])}>إفراغ البوكس</button>}
          <button type="button" className="cr-box-confirm" disabled={!isFull || !canOrder} onClick={onConfirm}>{isFull ? "راجع وأكّد الطلب" : "أكمل اختيارك"}</button>
        </div>
      </aside>

      <section className="cr-box-flavours">
        <div className="cr-box-flavours-head"><span className="cr-kicker">نكهات البوكس</span><h2>{isFull ? "البوكس اكتمل" : "اضغط على النكهة لإضافتها"}</h2><p>{isFull ? "احذف أي قطعة من البوكس إذا تبي تبدلها." : "تقدر تختار نفس النكهة أكثر من مرة."}</p></div>
        <ProductGrid products={products} quantities={quantities} disabled={isFull} onAdd={addProduct} onRemove={removeLast} mode="box" />
      </section>
    </div>
  );
}
