"use client";

import { useEffect, useMemo, useState } from "react";
import type { BoxSize, Customer, OrderMode, StoreContent } from "@/lib/types";
import { normalizeCities } from "@/lib/types";
import { saveCartSession } from "@/lib/cart-session";

type OrderSheetProps = {
  content: StoreContent;
  quantities: Record<string, number>;
  boxItems: string[];
  box: BoxSize;
  onClose: () => void;
  onNewOrder: () => void;
  onRemovePiece: (id: string) => void;
  onRemoveBoxItem: (id: string) => void;
  onClearCart: () => void;
};

const emptyCustomer: Customer = { name: "", phone: "", city: "", locationDescription: "" };

export function OrderSheet({ content, quantities, boxItems, box, onClose, onNewOrder, onRemovePiece, onRemoveBoxItem, onClearCart }: OrderSheetProps) {
  const [stepView, setStepView] = useState<"cart" | "checkout">("cart");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [errors, setErrors] = useState<Partial<Customer>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [orderId, setOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash">("cash");

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  const citiesList = useMemo(() => normalizeCities(content.store.cities), [content.store.cities]);
  const selectedCityObj = useMemo(() => citiesList.find((c) => c.name === customer.city), [citiesList, customer.city]);

  const toItems = (source: Record<string, number>) =>
    Object.entries(source)
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

  const pieceItems = useMemo(() => toItems(quantities), [quantities, content.products]);
  const boxSummaryItems = useMemo(() => toItems(boxItems.reduce<Record<string, number>>((result, id) => {
    result[id] = (result[id] ?? 0) + 1;
    return result;
  }, {})), [boxItems, content.products]);
  const mode: OrderMode = pieceItems.length && boxSummaryItems.length ? "mixed" : boxSummaryItems.length ? "box" : "pieces";
  const items = [...pieceItems, ...boxSummaryItems];

  const totalPieces = items.reduce((total, item) => total + item.quantity, 0);
  const piecePricesKnown = pieceItems.every((item) => item.price !== null);
  const piecesTotal = piecePricesKnown ? pieceItems.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0) : null;
  const productsTotal = piecesTotal === null ? null : piecesTotal + (boxSummaryItems.length ? box.price : 0);
  const boxComplete = boxItems.length === 0 || boxItems.length === box.capacity;

  const deliveryFee = selectedCityObj ? selectedCityObj.deliveryFee : 0;
  const estimatedTime = selectedCityObj ? selectedCityObj.estimatedTime : "اختر المدينة أولاً";
  const grandTotal = productsTotal !== null ? productsTotal + deliveryFee : null;

  const isCard1Valid = customer.name.trim().length >= 2 && customer.phone.replace(/\D/g, "").length >= 8 && Boolean(customer.city);

  function validate() {
    const next: Partial<Customer> = {};
    if (customer.name.trim().length < 2) next.name = "اكتب الاسم الرسمي";
    if (customer.phone.replace(/\D/g, "").length < 8) next.phone = "اكتب رقم هاتف صحيح مربوط بواتساب";
    if (!customer.city) next.city = "اختر المدينة للتوصيل";
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
          customer: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            city: customer.city,
            locationDescription: customer.locationDescription?.trim() || "",
          },
          items,
          pieceItems,
          boxItems: boxSummaryItems,
          box: boxSummaryItems.length ? box : undefined,
          totalPieces,
          productsTotal,
          deliveryFee,
          estimatedTime,
          grandTotal,
          paymentMethod: "كاش عند الاستلام",
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
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      onTouchMove={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
        }
      }}
    >
      <section className="order-sheet" role="dialog" aria-modal="true" aria-labelledby="order-sheet-title">
        <button className="sheet-close" type="button" onClick={onClose} aria-label="إغلاق">×</button>

        {status === "success" ? (
          <div className="success-state">
            <div className="success-icon-badge">🍪</div>
            <span className="eyebrow">تم تأكيد الطلب بنجاح</span>
            <h2 id="order-sheet-title">شكراً لك، تم استلام طلبك!</h2>
            <p>سنتواصل معك عبر واتساب لتأكيد الشحن والتوصيل.</p>
            <div className="order-number" dir="ltr">#{orderId}</div>

            {/* Final Order Confirmation Card Summary */}
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
                <strong>الدفع عند الاستلام (كاش)</strong>
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

            <button className="primary-action" type="button" onClick={onNewOrder}>طلب جديد</button>
          </div>
        ) : stepView === "cart" ? (
          /* STEP 1: CART VIEW - Show ONLY products & prices WITHOUT total */
          <div className="cart-preview-container">
            <div className="sheet-title">
              <span className="eyebrow">محتويات السلة</span>
              <h2 id="order-sheet-title">سلة المشتروات</h2>
              <p>الأصناف التي قمت باختيارها واسعارها.</p>
            </div>

            <div className="order-summary">
              <div className="summary-heading">
                <div><span>نوع الطلب</span><b>{mode === "mixed" ? "قطع + بوكس" : mode === "box" ? "بالبوكس" : "بالقطعة"}</b></div>
                <strong dir="ltr">{totalPieces} قطع</strong>
              </div>

              <div className="cart-summary-toolbar">
                <span>{pieceItems.length + boxSummaryItems.length} أصناف</span>
                <button type="button" onClick={onClearCart}>إفراغ السلة</button>
              </div>

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
                    <div className="summary-item-actions">
                      <div className="summary-item-price" dir="ltr">{item.price !== null ? `${item.price * item.quantity} ${content.store.currency}` : "يُحدد لاحقاً"}</div>
                      <button type="button" className="cart-remove-item" onClick={() => onRemovePiece(item.id)} aria-label={`حذف ${item.name} من السلة`}>×</button>
                    </div>
                  </li>
                ))}
              </ul></>}

              {boxSummaryItems.length > 0 && <><h3 className="cart-group-title"><span>{box.name}</span><b dir="ltr">{box.price} {content.store.currency}</b></h3><ul className="summary-items-list">
                {boxSummaryItems.map((item) => (
                  <li key={`box-${item.id}`} className="summary-item-row">
                    <div className="summary-item-left"><img src={item.image} alt={item.name} className="summary-item-thumb" /><div className="summary-item-details"><span className="summary-item-name">{item.name}</span><span className="summary-item-qty">×{item.quantity}</span></div></div>
                    <div className="summary-item-actions"><span className="summary-item-price">ضمن البوكس</span><button type="button" className="cart-remove-item" onClick={() => onRemoveBoxItem(item.id)} aria-label={`حذف ${item.name} من البوكس`}>×</button></div>
                  </li>
                ))}
              </ul>{!boxComplete && <p className="cart-box-warning">أكمل البوكس: اختر {box.capacity - boxItems.length} قطع إضافية أو احذف البوكس.</p>}</>}
            </div>

            <button
              className="primary-action sheet-submit"
              type="button"
              onClick={() => {
                if (!boxComplete) return;
                saveCartSession({
                  mode,
                  quantities,
                  boxItems,
                  activeBoxId: box.id,
                });
                window.location.href = "/checkout";
              }}
              disabled={!boxComplete || items.length === 0}
            >
              {!boxComplete ? "أكمل البوكس أولاً" : "مواصلة وإكمال الطلب ←"}
            </button>
          </div>
        ) : (
          /* STEP 2: CHECKOUT VIEW - Sequential Multi-Card Confirmation Page */
          <form onSubmit={submitOrder} noValidate className="checkout-cards-flow">
            <div className="checkout-header-row">
              <button type="button" className="checkout-back-btn" onClick={() => setStepView("cart")}>
                ← تعديل السلة
              </button>
            </div>

            <div className="sheet-title">
              <span className="eyebrow">صفحة تأكيد الطلب</span>
              <h2 id="order-sheet-title">تأكيد الطلب والتوصيل</h2>
              <p>أدخل بياناتك لفتح الفاتورة النهائية وحساب التوصيل.</p>
            </div>

            {/* CARD 1: Customer Personal Info & Delivery Location */}
            <article className={`checkout-card ${isCard1Valid ? "is-complete" : "is-active"}`}>
              <div className="checkout-card-header">
                <span className="card-step-badge">1</span>
                <div>
                  <h3>المعلومات الشخصية والتوصيل</h3>
                  <p>أدخل اسمك ورقم الهاتف المربوط بواتساب والمدينة</p>
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
            <article className={`checkout-card ${isCard1Valid ? "is-unlocked" : "is-locked"}`}>
              <div className="checkout-card-header">
                <span className="card-step-badge">2</span>
                <div>
                  <h3>الفاتورة وخيارات الدفع</h3>
                  <p>تفاصيل الأصناف ورسوم التوصيل والمجموع النهائي</p>
                </div>
              </div>

              {!isCard1Valid ? (
                <div className="locked-card-banner">
                  <span className="lock-icon">🔒</span>
                  <span>أكمل بطاقة المعلومات (الاسم، الواتساب، والمدينة) أعلاه لفتح الفاتورة.</span>
                </div>
              ) : (
                <>
                  <div className="order-summary">
                    <div className="summary-heading">
                      <div><span>نوع الطلب</span><b>{mode === "box" ? "بالبوكس" : "بالقطعة"}</b></div>
                      <strong dir="ltr">{mode === "box" ? box.name : `${totalPieces} قطع`}</strong>
                    </div>

                    <ul className="summary-items-list">
                      {items.map((item) => (
                        <li key={item.id} className="summary-item-row">
                          <div className="summary-item-left">
                            <img src={item.image} alt={item.name} className="summary-item-thumb" />
                            <div className="summary-item-details">
                              <span className="summary-item-name">{item.name}</span>
                              <span className="summary-item-qty">×{item.quantity}</span>
                            </div>
                          </div>
                          <div className="summary-item-price" dir="ltr">
                            {item.price !== null && item.price !== undefined
                              ? `${item.price * item.quantity} ${content.store.currency}`
                              : "يُحدد لاحقاً"}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="summary-breakdown">
                      <div className="summary-breakdown-row">
                        <span>مجموع الأصناف</span>
                        <b dir="ltr">{productsTotal === null ? "يُحدد لاحقاً" : `${productsTotal} ${content.store.currency}`}</b>
                      </div>
                      <div className="summary-breakdown-row">
                        <div>
                          <span>سعر التوصيل ({customer.city})</span>
                          <small className="estimated-time-tag">⏱️ {estimatedTime}</small>
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
                        <span className="payment-icon">💵</span>
                        <div className="payment-text">
                          <strong>الدفع عند الاستلام (كاش)</strong>
                          <small>ادفع نقداً للمندوب عند وصول الطلب إليك</small>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </article>

            {status === "error" && <div className="form-error" role="alert">تعذر إرسال الطلب حالياً، حاول مرة أخرى.</div>}

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
      </section>
    </div>
  );
}
