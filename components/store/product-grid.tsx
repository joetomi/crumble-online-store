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

export function ProductGrid({
  products,
  quantities,
  disabled,
  onAdd,
  onRemove,
  mode,
}: ProductGridProps) {
  return (
    <div className={`product-grid product-grid--${mode}`}>
      {products.map((product, index) => {
        const quantity = quantities[product.id] ?? 0;
        return (
          <article
            className={`product-item ${disabled ? "is-dimmed" : ""}`}
            key={product.id}
            style={{ "--accent": product.accent, "--delay": `${index * 35}ms` } as React.CSSProperties}
          >
            <button
              className="product-image-button"
              type="button"
              aria-label={`إضافة ${product.name}`}
              aria-disabled={disabled}
              onClick={(event) => {
                if (!disabled) onAdd(product, event.currentTarget);
              }}
            >
              <span className="product-orbit" aria-hidden="true" />
              <img src={product.image} alt={product.name} loading={index > 3 ? "lazy" : "eager"} />
              {quantity > 0 && (
                <span className="quantity-pop" key={quantity} dir="ltr">
                  ×{quantity}
                </span>
              )}
              {disabled && <span className="complete-mark">اكتمل</span>}
            </button>
            <div className="product-copy">
              <h3 dir="ltr">{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-meta">
                <span className="price-text" dir="ltr">
                  {product.price === null ? "السعر قريباً" : `${product.price} د.ل`}
                </span>
                <div className="stepper" aria-label={`كمية ${product.name}`}>
                  <button
                    type="button"
                    aria-label={`إنقاص ${product.name}`}
                    disabled={quantity === 0}
                    onClick={() => onRemove(product)}
                  >
                    −
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    aria-label={`زيادة ${product.name}`}
                    disabled={disabled}
                    onClick={(event) => onAdd(product, event.currentTarget)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
