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
};

export function ProductGrid({ products, quantities, disabled, onAdd, onRemove, mode }: ProductGridProps) {
  return (
    <div className={`cr-product-grid cr-product-grid--${mode}`}>
      {products.map((product, index) => {
        const quantity = quantities[product.id] ?? 0;
        return (
          <article
            className={`cr-product ${disabled ? "is-disabled" : ""}`}
            key={product.id}
            style={{ "--product-accent": product.accent, "--reveal-delay": `${index * 45}ms` } as React.CSSProperties}
          >
            <button
              className="cr-product-photo"
              type="button"
              aria-label={`إضافة ${product.name}`}
              aria-disabled={disabled}
              onClick={(event) => !disabled && onAdd(product, event.currentTarget)}
            >
              <img src={product.image} alt={product.name} loading={index > 2 ? "lazy" : "eager"} />
              {quantity > 0 && <span className="cr-product-count" dir="ltr">×{quantity}</span>}
              {disabled && <span className="cr-product-full">البوكس ممتلئ</span>}
            </button>

            <div className="cr-product-details">
              <div className="cr-product-copy">
                <span className="cr-product-number" dir="ltr">0{index + 1}</span>
                <h3 dir="ltr">{product.name}</h3>
                <p>{product.description}</p>
                {product.price !== null && <strong className="cr-product-price" dir="ltr">{product.price} د.ل</strong>}
              </div>
              {quantity === 0 ? (
                <button className="cr-add-product" type="button" disabled={disabled} onClick={(event) => onAdd(product, event.currentTarget)}>
                  <span>{disabled ? "مكتمل" : "أضف للطلب"}</span><b aria-hidden="true">+</b>
                </button>
              ) : (
                <div className="cr-stepper" aria-label={`كمية ${product.name}`}>
                  <button type="button" aria-label={`إنقاص ${product.name}`} onClick={() => onRemove(product)}>−</button>
                  <span aria-live="polite">{quantity}</span>
                  <button type="button" aria-label={`زيادة ${product.name}`} disabled={disabled} onClick={(event) => onAdd(product, event.currentTarget)}>+</button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
