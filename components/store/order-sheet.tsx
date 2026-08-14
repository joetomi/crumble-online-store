"use client";

import { useMemo, useState } from "react";
import type { BoxSize, Customer, OrderMode, Product, StoreContent } from "@/lib/types";

type OrderSheetProps = {
  content: StoreContent;
  mode: OrderMode;
  quantities: Record<string, number>;
  boxItems: string[];
  box: BoxSize;
  onClose: () => void;
  onNewOrder: () => void;
};

const emptyCustomer: Customer = { name: "", phone: "", city: "" };

export function OrderSheet({ content, mode, quantities, boxItems, box, onClose, onNewOrder }: OrderSheetProps) {
  const [customer, setCustomer] = useState(emptyCustomer);
  const [errors, setErrors] = useState<Partial<Customer>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [orderId, setOrderId] = useState("");

  const items = useMemo(() => {
    const source = mode === "pieces"
      ? quantities
      : boxItems.reduce<Record<string, number>>((result, id) => {
          result[id] = (result[id] ?? 0) + 1;
          return result;
        }, {});

    return Object.entries(source)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => {
        const product = content.products.find((entry) => entry.id === id) as Product;
        return { id, name: product.name, quantity, price: product.price };
      });
  }, [mode, quantities, boxItems, content.products]);

  const totalPieces = items.reduce((total, item) => total + item.quantity, 0);
  const hasUnknownPrice = items.some((item) => item.price === null);
  const totalPrice = mode === "box"
    ? box.price
    : hasUnknownPrice
      ? null
      : items.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0);

  function validate() {
    const next: Partial<Customer> = {};
    if (customer.name.trim().length < 2) next.name = "اكتب الاسم";
    if (customer.phone.replace(/\D/g, "").length < 8) next.phone = "اكتب رقم هاتف صحيح";
    if (!customer.city) next.city = "اختر المدينة";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!validate() || status === "submitting") return;
    setStatus("submitting");

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          customer: { name: customer.name.trim(), phone: customer.phone.trim(), city: customer.city },
          items,
          box: mode === "box" ? box : undefined,
          totalPieces,
          totalPrice,
        }),
      });
      const result = (await response.json()) as { orderId?: string };
      if (!response.ok || !result.orderId) throw new Error("Order request failed");
      setOrderId(result.orderId);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="order-sheet" role="dialog" aria-modal="true" aria-labelledby="order-sheet-title">
        <button className="sheet-close" type="button" onClick={onClose} aria-label="إغلاق">×</button>

        {status === "success" ? (
          <div className="success-state">
            <span className="success-cookie" aria-hidden="true">🍪</span>
            <span className="eyebrow">تم بنجاح</span>
            <h2 id="order-sheet-title">تم استلام طلبك</h2>
            <p>سنتواصل معك لتأكيد الطلب.</p>
            <div className="order-number" dir="ltr">#{orderId}</div>
            <button className="primary-action" type="button" onClick={onNewOrder}>طلب جديد</button>
          </div>
        ) : (
          <form onSubmit={submitOrder} noValidate>
            <div className="sheet-title">
              <span className="eyebrow">الخطوة الأخيرة</span>
              <h2 id="order-sheet-title">أكد طلبك</h2>
              <p>بيانات بسيطة حتى نتواصل معك.</p>
            </div>

            <div className="order-summary">
              <div className="summary-heading">
                <div><span>نوع الطلب</span><b>{mode === "box" ? "بالبوكس" : "بالقطعة"}</b></div>
                <strong dir="ltr">{mode === "box" ? box.name : `${totalPieces} قطع`}</strong>
              </div>
              <ul>
                {items.map((item) => <li key={item.id}><span dir="ltr">{item.name}</span><b dir="ltr">×{item.quantity}</b></li>)}
              </ul>
              <div className="summary-total">
                <span>الإجمالي</span>
                <b dir="ltr">{totalPrice === null ? "يُحدد عند التأكيد" : `${totalPrice} ${content.store.currency}`}</b>
              </div>
            </div>

            <div className="customer-fields">
              <label>
                <span>الاسم</span>
                <input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="اسمك الكريم" autoComplete="name" aria-invalid={Boolean(errors.name)} />
                {errors.name && <small>{errors.name}</small>}
              </label>
              <label>
                <span>رقم الهاتف</span>
                <input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="09XXXXXXXX" inputMode="tel" autoComplete="tel" dir="ltr" aria-invalid={Boolean(errors.phone)} />
                {errors.phone && <small>{errors.phone}</small>}
              </label>
              <label>
                <span>المدينة</span>
                <select value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} aria-invalid={Boolean(errors.city)}>
                  <option value="">اختر المدينة</option>
                  {content.store.cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
                {errors.city && <small>{errors.city}</small>}
              </label>
            </div>

            {status === "error" && <div className="form-error" role="alert">تعذر إرسال الطلب حالياً، حاول مرة أخرى.</div>}

            <button className="primary-action sheet-submit" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? <><span className="spinner" /> جاري إرسال الطلب</> : status === "error" ? "إعادة المحاولة" : "إرسال الطلب"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
