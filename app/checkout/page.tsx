"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { defaultContent, readLocalContent } from "@/lib/store-content";
import { loadCartSession, saveCartSession, clearCartSession } from "@/lib/cart-session";
import type { Customer, StoreContent, CartSession, PaymentMethod } from "@/lib/types";
import { normalizeCities } from "@/lib/types";

const emptyCustomer: Customer = { name: "", phone: "", city: "", locationDescription: "" };

export default function CheckoutPage() {
  const [content, setContent] = useState<StoreContent>(defaultContent);
  const [cartSession, setCartSession] = useState<CartSession | null>(null);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [errors, setErrors] = useState<Partial<Customer>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [orderId, setOrderId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setContent(readLocalContent());
    const session = loadCartSession();
    setCartSession(session);
    setLoaded(true);
  }, []);

  const citiesList = useMemo(() => normalizeCities(content.store.cities), [content.store.cities]);
  const selectedCityObj = useMemo(() => citiesList.find((c) => c.name === customer.city), [citiesList, customer.city]);

  const hasPieces = Boolean(cartSession && Object.values(cartSession.quantities).some((quantity) => quantity > 0));
  const hasBox = Boolean(cartSession?.boxes?.length);
  const mode = hasPieces && hasBox ? "mixed" : hasBox ? "box" : "pieces";

  const pieceItems = useMemo(() => {
    if (!cartSession) return [];
    return Object.entries(cartSession.quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => {
        const product = content.products.find((entry) => entry.id === id);
        return {
          id,
          name: product ? product.name : "صنف",
          image: product?.image || "/brand/crumble-logo.png",
          quantity,
          price: product ? product.price : null,
        };
      });
  }, [cartSession, content.products]);

  const boxGroups = useMemo(() => {
    if (!cartSession) return [];
    return (cartSession.boxes ?? []).map((cartBox) => {
      const box = content.boxes.find((entry) => entry.id === cartBox.boxId);
      const source = cartBox.items.reduce<Record<string, number>>((result, id) => {
        result[id] = (result[id] ?? 0) + 1;
        return result;
      }, {});
      const items = Object.entries(source).map(([id, quantity]) => {
        const product = content.products.find((entry) => entry.id === id);
        return { id, name: product?.name || "صنف", image: product?.image || "/brand/crumble-logo.png", quantity, price: product?.price ?? null };
      });
      return { cartBox, box, items };
    }).filter((group) => group.box);
  }, [cartSession, content.boxes, content.products]);

  const boxItems = boxGroups.flatMap((group) => group.items);
  const items = [...pieceItems, ...boxItems];

  const totalPieces = items.reduce((total, item) => total + item.quantity, 0);
  const piecesTotal = pieceItems.some((item) => item.price === null) ? null : pieceItems.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0);
  const productsTotal = piecesTotal === null ? null : piecesTotal + boxGroups.reduce((total, group) => total + (group.box?.price ?? 0), 0);

  const deliveryFee = selectedCityObj ? selectedCityObj.deliveryFee : 0;
  const estimatedTime = selectedCityObj ? selectedCityObj.estimatedTime : "اختر المدينة أولاً";
  const grandTotal = productsTotal !== null ? productsTotal + deliveryFee : null;

  const isCard1Valid = customer.name.trim().length >= 2 && customer.phone.replace(/\D/g, "").length >= 8 && Boolean(customer.city);

  function updateCart(next: CartSession) {
    setCartSession(next);
    saveCartSession(next);
  }

  function removePiece(id: string) {
    if (!cartSession) return;
    const quantities = { ...cartSession.quantities };
    delete quantities[id];
    updateCart({ ...cartSession, quantities });
  }

  function removeBox(id: string) {
    if (!cartSession) return;
    updateCart({ ...cartSession, boxes: (cartSession.boxes ?? []).filter((box) => box.id !== id) });
  }

  function emptyCart() {
    clearCartSession();
    setCartSession(null);
  }

  function validate() {
    const next: Partial<Customer> = {};
    if (customer.name.trim().length < 2) next.name = "اكتب الاسم الرسمي الكامل";
    if (customer.phone.replace(/\D/g, "").length < 8) next.phone = "اكتب رقم هاتف صحيح مربوط بواتساب";
    if (!customer.city) next.city = "اختر المدينة للتوصيل";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!validate() || status === "submitting") return;
    setStatus("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          customer: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            city: customer.city,
            locationDescription: customer.locationDescription?.trim() || "",
          },
          items,
          pieceItems,
          boxes: boxGroups.map((group) => ({ id: group.box!.id, items: group.items })),
          totalPieces,
          productsTotal,
          deliveryFee,
          estimatedTime,
          grandTotal,
          paymentMethod,
        }),
      });
      const result = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok || !result.orderId) {
        const messages: Record<string, string> = {
          ordering_unavailable: "استقبال الطلبات غير مفعّل حالياً. راجع إعدادات تيليغرام في Vercel.",
          telegram_chat_not_found: "تعذر الوصول إلى محادثة تيليغرام. تأكد من Chat ID وأنك ضغطت Start داخل البوت.",
          telegram_failed: "تيليغرام رفض إرسال الطلب. تحقق من إعدادات البوت ثم أعد المحاولة.",
          ordering_closed: "المتجر مغلق حالياً ولا يستقبل طلبات جديدة.",
          invalid_city: "المدينة المختارة غير متاحة حالياً. اخترها من القائمة من جديد.",
          invalid_items: "بعض أصناف الطلب تغيرت. ارجع للمتجر وحدّث السلة.",
          invalid_quantity: "عدد القطع لا يطابق حجم البوكس المختار.",
          invalid_box_product: "يحتوي البوكس على نكهة من نوع غير مسموح. ارجع للمتجر وأعد اختيار النكهات.",
        };
        throw new Error(messages[result.error ?? ""] ?? "تعذر إرسال الطلب حالياً. حاول مرة أخرى.");
      }
      setOrderId(result.orderId);
      setStatus("success");
      clearCartSession();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "تعذر إرسال الطلب حالياً. حاول مرة أخرى.");
      setStatus("error");
    }
  }

  if (!loaded) {
    return (
      <div className="checkout-page-loading">
        <div className="spinner" />
        <p>جاري تحميل صفحة تأكيد الطلب...</p>
      </div>
    );
  }

  if (!cartSession || items.length === 0) {
    return (
      <div className="checkout-page-standalone">
        <header className="checkout-page-header">
          <Link href="/" className="checkout-brand-logo">
            <img src={content.brand.logo} alt={content.brand.name} />
            <div>
              <b>{content.brand.name}</b>
              <span>{content.brand.slogan}</span>
            </div>
          </Link>
          <Link href="/" className="checkout-back-link">← العودة للمتجر</Link>
        </header>
        <main className="checkout-empty-card">
          <span className="empty-icon">🍪</span>
          <h2>سلتك فارغة حالياً</h2>
          <p>لم تقم باختيار أي أصناف بعد. عد للمتجر واختيار نكهاتك المفضلة!</p>
          <Link href="/" className="primary-action">العودة للتسوق في المتجر ←</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page-standalone">
      {/* Top Header */}
      <header className="checkout-page-header">
        <Link href="/" className="checkout-brand-logo">
          <img src={content.brand.logo} alt={content.brand.name} />
          <div>
            <b>{content.brand.name}</b>
            <span>{content.brand.slogan}</span>
          </div>
        </Link>
        <Link href="/" className="checkout-back-link">← العودة لتعديل السلة</Link>
      </header>

      <main className="checkout-page-container">
        {status === "success" ? (
          <div className="success-state checkout-card-standalone">
            <div className="success-icon-badge">🍪</div>
            <span className="eyebrow">تم تأكيد الطلب بنجاح</span>
            <h2>شكراً لك، تم استلام طلبك!</h2>
            <p>سنتواصل معك عبر واتساب لتأكيد الشحن والتوصيل.</p>
            <div className="order-number" dir="ltr">#{orderId}</div>

            {/* Final Order Confirmation Summary Card */}
            <div className="confirmation-summary-card">
              <div className="summary-row">
                <span>اسم العميل</span>
                <strong>{customer.name}</strong>
              </div>
              <div className="summary-row">
                <span>رقم الواتساب</span>
                <strong dir="ltr">{customer.phone}</strong>
              </div>
              <div className="summary-row">
                <span>مدينة التوصيل</span>
                <strong>{customer.city} ({estimatedTime})</strong>
              </div>
              {customer.locationDescription?.trim() && (
                <div className="summary-row">
                  <span>وصف الموقع</span>
                  <strong>{customer.locationDescription.trim()}</strong>
                </div>
              )}
              <div className="summary-row">
                <span>طريقة الدفع</span>
                <strong>{paymentMethod === "bank_transfer" ? "تحويل مصرفي" : "الدفع عند الاستلام (كاش)"}</strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-row">
                <span>مجموع المنتجات</span>
                <span dir="ltr">{productsTotal} {content.store.currency}</span>
              </div>
              <div className="summary-row">
                <span>سعر التوصيل</span>
                <span dir="ltr">{deliveryFee} {content.store.currency}</span>
              </div>
              <div className="summary-row summary-row--total">
                <span>المجموع النهائي</span>
                <strong dir="ltr">{grandTotal} {content.store.currency}</strong>
              </div>
            </div>

            <Link href="/" className="primary-action">العودة للمتجر الرئيسي ←</Link>
          </div>
        ) : (
          <form onSubmit={submitOrder} noValidate className="checkout-cards-flow standalone-flow">
            <div className="checkout-page-title">
              <span className="eyebrow">خطوة أخيرة</span>
              <h1>تأكيد طلبك</h1>
              <p>بيانات بسيطة، ثم نرسل طلبك مباشرة إلى فريق Crumble.</p>
            </div>

            {/* CARD 1: Customer Personal Info & Delivery Location */}
            <article className={`checkout-card ${isCard1Valid ? "is-complete" : "is-active"}`}>
              <div className="checkout-card-header">
                <span className="card-step-badge">1</span>
                <div>
                  <h3>بيانات الاستلام</h3>
                  <p>حتى نتواصل معك ونوصل الطلب</p>
                </div>
              </div>

              <div className="customer-fields">
                <label>
                  <span>الاسم الكريم</span>
                  <input
                    value={customer.name}
                    onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                    placeholder="اسمك الكريم الكامل..."
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name && <small>{errors.name}</small>}
                </label>

                <label>
                  <span>رقم الهاتف (مربوط بواتساب)</span>
                  <div className="whatsapp-input-group">
                    <span className="whatsapp-prefix-badge" title="مربوط بـ WhatsApp">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
                        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.769.462 3.498 1.341 5.022l-1.424 5.203 5.326-1.396c1.468.801 3.125 1.223 4.743 1.224h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.668-1.038-5.176-2.924-7.062a9.923 9.923 0 0 0-7.065-2.915z" />
                      </svg>
                      <small>واتساب</small>
                    </span>
                    <input
                      value={customer.phone}
                      onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                      placeholder="09XXXXXXXX"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      aria-invalid={Boolean(errors.phone)}
                    />
                  </div>
                  {errors.phone && <small>{errors.phone}</small>}
                </label>

                <label>
                  <span>مدينة التوصيل</span>
                  <select
                    value={customer.city}
                    onChange={(event) => setCustomer({ ...customer, city: event.target.value })}
                    aria-invalid={Boolean(errors.city)}
                  >
                    <option value="">اختر مدينتك...</option>
                    {citiesList.map((cityObj) => (
                      <option key={cityObj.id} value={cityObj.name}>
                        {cityObj.name} (توصيل {cityObj.deliveryFee} {content.store.currency})
                      </option>
                    ))}
                  </select>
                  {errors.city && <small>{errors.city}</small>}
                </label>

                <label className="customer-field-wide">
                  <span>وصف الموقع <em>(اختياري)</em></span>
                  <textarea
                    value={customer.locationDescription ?? ""}
                    onChange={(event) => setCustomer({ ...customer, locationDescription: event.target.value })}
                    placeholder="مثال: اسم الشارع، أقرب نقطة دالة أو وصف المنزل..."
                    autoComplete="street-address"
                    maxLength={300}
                    rows={2}
                  />
                </label>
              </div>
            </article>

            {/* CARD 2: Invoice, Delivery Fee & Payment Method (Unlocked when Card 1 is valid) */}
            <article className={`checkout-card ${isCard1Valid ? "is-unlocked" : "is-locked"}`} aria-disabled={!isCard1Valid}>
              <div className="checkout-card-header">
                <span className="card-step-badge">2</span>
                <div>
                  <h3>الفاتورة وخيارات الدفع</h3>
                  <p>راجع الأصناف والتكلفة قبل التأكيد</p>
                </div>
              </div>

              {!isCard1Valid && (
                <div className="locked-card-banner" role="status">
                  <span className="lock-icon">🔒</span>
                  <span>أكمل الاسم ورقم الواتساب والمدينة لفتح الفاتورة وتأكيد الطلب.</span>
                </div>
              )}

              <fieldset className="checkout-card-body" disabled={!isCard1Valid}>
                  <div className="order-summary">
                    <div className="summary-heading">
                      <div><span>نوع الطلب</span><b>{mode === "mixed" ? "قطع + بوكسات" : mode === "box" ? "بالبوكسات" : "بالقطعة"}</b></div>
                      <strong dir="ltr">{totalPieces} قطع</strong>
                    </div>

                    <div className="cart-summary-toolbar"><span>{pieceItems.length + boxGroups.length} عناصر</span><button type="button" onClick={emptyCart}>إفراغ السلة</button></div>
                    {pieceItems.length > 0 && <><h3 className="cart-group-title">بالقطعة</h3><ul className="summary-items-list">
                      {pieceItems.map((item) => (
                        <li key={item.id} className="summary-item-row">
                          <div className="summary-item-left">
                            <img src={item.image} alt={item.name} className="summary-item-thumb" />
                            <div className="summary-item-details">
                              <span className="summary-item-name">{item.name}</span>
                              <span className="summary-item-qty">×{item.quantity}</span>
                            </div>
                          </div>
                          <div className="summary-item-actions"><div className="summary-item-price" dir="ltr">{item.price !== null ? `${item.price * item.quantity} ${content.store.currency}` : "يُحدد لاحقاً"}</div><button type="button" className="cart-remove-item" onClick={() => removePiece(item.id)} aria-label={`حذف ${item.name}`}>×</button></div>
                        </li>
                      ))}
                    </ul></>}
                    {boxGroups.map((group, index) => <section className="cart-box-group" key={group.cartBox.id}>
                      <h3 className="cart-group-title"><span>{group.box!.name} <small>#{index + 1}</small></span><b dir="ltr">{group.box!.price} {content.store.currency}</b><button type="button" className="cart-remove-item" onClick={() => removeBox(group.cartBox.id)} aria-label={`حذف ${group.box!.name}`}>×</button></h3>
                      <ul className="summary-items-list">{group.items.map((item) => <li key={`${group.cartBox.id}-${item.id}`} className="summary-item-row"><div className="summary-item-left"><img src={item.image} alt={item.name} className="summary-item-thumb" /><div className="summary-item-details"><span className="summary-item-name">{item.name}</span><span className="summary-item-qty">×{item.quantity}</span></div></div><span className="summary-item-price">ضمن البوكس</span></li>)}</ul>
                    </section>)}

                    <div className="summary-breakdown">
                      <div className="summary-breakdown-row">
                        <span>مجموع الأصناف</span>
                        <b dir="ltr">{productsTotal === null ? "يُحدد لاحقاً" : `${productsTotal} ${content.store.currency}`}</b>
                      </div>
                      <div className="summary-breakdown-row">
                        <div>
                          <span>التوصيل {customer.city ? `(${customer.city})` : ""}</span>
                          <small className="estimated-time-tag">{estimatedTime}</small>
                        </div>
                        <b dir="ltr">{deliveryFee} {content.store.currency}</b>
                      </div>
                      <div className="summary-total-row">
                        <span>المجموع النهائي</span>
                        <strong dir="ltr">{grandTotal === null ? "يُحدد عند التأكيد" : `${grandTotal} ${content.store.currency}`}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector Card */}
                  <div className="payment-method-section">
                    <span className="payment-section-title">طريقة الدفع المتاحة:</span>
                    <div className="payment-options-grid">
                      <label className={`payment-option-card ${paymentMethod === "cash" ? "is-selected" : ""}`}>
                        <input
                          type="radio"
                          name="payment"
                          value="cash"
                          checked={paymentMethod === "cash"}
                          onChange={() => setPaymentMethod("cash")}
                        />
                      <span className="payment-icon">كاش</span>
                        <div className="payment-text">
                          <strong>الدفع عند الاستلام (كاش)</strong>
                          <small>ادفع نقداً للمندوب عند وصول الطلب إليك</small>
                        </div>
                      </label>
                      <label className={`payment-option-card ${paymentMethod === "bank_transfer" ? "is-selected" : ""}`}>
                        <input
                          type="radio"
                          name="payment"
                          value="bank_transfer"
                          checked={paymentMethod === "bank_transfer"}
                          onChange={() => setPaymentMethod("bank_transfer")}
                        />
                        <span className="payment-icon">تحويل</span>
                        <div className="payment-text">
                          <strong>تحويل مصرفي</strong>
                          <small>سنرسل لك بيانات الحساب عبر واتساب</small>
                        </div>
                      </label>
                    </div>
                    {paymentMethod === "bank_transfer" && (
                      <div className="bank-transfer-note" role="note">
                        سيتم التواصل معك على واتساب لإرسال بيانات الحساب وإكمال عملية الدفع.
                      </div>
                    )}
                  </div>
              </fieldset>
            </article>

            {status === "error" && <div className="form-error checkout-submit-error" role="alert">{submitError}</div>}

            <button
              className="primary-action sheet-submit"
              type="submit"
              disabled={!isCard1Valid || status === "submitting"}
            >
              {!isCard1Valid ? (
                "أكمل بيانات الاستلام أولاً"
              ) : status === "submitting" ? (
                <><span className="spinner" /> جاري تأكيد وإرسال الطلب...</>
              ) : status === "error" ? (
                "إعادة المحاولة"
              ) : (
                "تأكيد الطلب الآن ←"
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
