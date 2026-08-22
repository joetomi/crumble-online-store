"use client";
/* eslint-disable @next/next/no-img-element */

import type { Product } from "@/lib/types";

type ProductGridProps = {
  products: Product[];
  quantities: Record<string, number>;
  disabled?: boolean;
  onAdd: (product: Product, source: HTMLElement) => void;
  onRemove: (product: Product) => void;
  mode: "pieces" | "box";
  currency: string;
};

export function ProductGrid({ products, quantities, disabled, onAdd, onRemove, mode, currency }: ProductGridProps) {
  return (
    <div className={`cr-product-grid cr-product-grid--${mode}`}>
      {products.map((product, index) => {
        const quantity = quantities[product.id] ?? 0;
        return (
          <article className={`cr-product-card ${disabled ? "is-disabled" : ""}`} key={product.id}>
            <button
              className="cr-product-photo"
              type="button"
              aria-label={`إضافة ${product.name}`}
              disabled={disabled}
              onClick={(event) => onAdd(product, event.currentTarget)}
            >
              <img src={product.image} alt={product.name} loading={index > 3 ? "lazy" : "eager"} />
              {quantity > 0 && <span className="cr-product-count" dir="ltr">{quantity}</span>}
            </button>

            <div className="cr-product-info">
              <div className="cr-product-copy">
                <h3 dir="auto">{product.name}</h3>
                <p>{product.description}</p>
              </div>

              {quantity === 0 ? (
                <button className="cr-product-add" type="button" disabled={disabled} onClick={(event) => onAdd(product, event.currentTarget)}>
                  <span>{disabled ? "مكتمل" : "إضافة"}</span>
                  <b dir="ltr">{product.price !== null ? `${product.price} ${currency}` : "+"}</b>
                </button>
              ) : (
                <div className="cr-selected-product-controls">
                  <b className="cr-selected-product-price" dir="ltr">
                    {product.price !== null ? `${product.price} ${currency}` : "السعر قريباً"}
                  </b>
                  <div className="cr-mini-stepper" aria-label={`كمية ${product.name}`}>
                    <button type="button" aria-label={`إنقاص ${product.name}`} onClick={() => onRemove(product)}>−</button>
                    <span aria-live="polite" dir="ltr">{quantity}</span>
                    <button type="button" aria-label={`زيادة ${product.name}`} disabled={disabled} onClick={(event) => onAdd(product, event.currentTarget)}>+</button>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
