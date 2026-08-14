"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  clearLocalContent,
  defaultContent,
  readLocalContent,
  validateContent,
  writeLocalContent,
} from "@/lib/store-content";
import type { BoxSize, Product, StoreContent } from "@/lib/types";

type AdminSection = "products" | "boxes" | "settings" | "json";

export function AdminDashboard() {
  const [content, setContent] = useState<StoreContent>(defaultContent);
  const [section, setSection] = useState<AdminSection>("products");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setContent(readLocalContent());
    sync();
  }, []);

  function update(next: StoreContent) {
    setContent(next);
    setDirty(true);
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function savePreview() {
    writeLocalContent(content);
    setDirty(false);
    flash("تم حفظ نسخة المعاينة على هذا الجهاز");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "store.json";
    link.click();
    URL.revokeObjectURL(href);
    flash("تم تجهيز ملف store.json");
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!validateContent(parsed)) throw new Error("Invalid content");
      update(parsed);
      setSection("products");
      flash("تم استيراد الملف — راجعه ثم احفظ المعاينة");
    } catch {
      flash("الملف غير صالح أو بنيته غير مكتملة");
    }
  }

  function resetContent() {
    if (!window.confirm("هل تريد الرجوع إلى بيانات الموقع الأصلية؟")) return;
    clearLocalContent();
    setContent(defaultContent);
    setDirty(false);
    flash("تمت استعادة النسخة الأصلية");
  }

  function addProduct() {
    const id = `product-${Date.now().toString(36)}`;
    const product: Product = {
      id,
      name: "نكهة جديدة",
      description: "وصف قصير للنكهة.",
      image: "/products/crumble-classic.jpg",
      price: null,
      available: true,
      category: "new",
      variant: "signature",
      accent: "#ad7957",
    };
    update({ ...content, products: [...content.products, product] });
  }

  function updateProduct(index: number, changes: Partial<Product>) {
    const products = content.products.map((product, productIndex) =>
      productIndex === index ? { ...product, ...changes } : product,
    );
    update({ ...content, products });
  }

  function removeProduct(index: number) {
    update({ ...content, products: content.products.filter((_, productIndex) => productIndex !== index) });
  }

  function addBox() {
    const box: BoxSize = {
      id: `box-${Date.now().toString(36)}`,
      name: "Box 6",
      capacity: 6,
      price: 60,
      enabled: true,
      description: "بوكس جديد قابل للتخصيص.",
    };
    update({ ...content, boxes: [...content.boxes, box] });
  }

  function updateBox(index: number, changes: Partial<BoxSize>) {
    const boxes = content.boxes.map((box, boxIndex) => boxIndex === index ? { ...box, ...changes } : box);
    update({ ...content, boxes });
  }

  function removeBox(index: number) {
    update({ ...content, boxes: content.boxes.filter((_, boxIndex) => boxIndex !== index) });
  }

  function uploadProductImage(index: number, file: File) {
    if (file.size > 2_500_000) {
      flash("يفضل أن يكون حجم الصورة أقل من 2.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateProduct(index, { image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <main className="admin-shell" dir="rtl">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/">
          <img src={content.brand.logo} alt="" />
          <span><b>CRUMBLE</b><small>Content Studio</small></span>
        </Link>
        <Link className="preview-link" href="/">عرض المتجر <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="admin-hero">
        <div>
          <span className="eyebrow">لوحة تحكم المحتوى</span>
          <h1>المتجر يتغيّر من ملف واحد.</h1>
          <p>عدّل النكهات والصور والبوكسات، جرّبها على جهازك، ثم صدّر JSON وارفعه إلى GitHub.</p>
        </div>
        <div className="admin-stats">
          <div><strong>{content.products.length}</strong><span>منتجات</span></div>
          <div><strong>{content.boxes.length}</strong><span>بوكسات</span></div>
          <div><strong>{content.store.orderingEnabled ? "ON" : "OFF"}</strong><span>الطلبات</span></div>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="أقسام لوحة التحكم">
          {([
            ["products", "المنتجات"],
            ["boxes", "البوكسات"],
            ["settings", "الإعدادات"],
            ["json", "ملف JSON"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={section === id ? "is-active" : ""} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="admin-actions">
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => event.target.files?.[0] && importJson(event.target.files[0])}
          />
          <button type="button" className="secondary-action" onClick={() => importRef.current?.click()}>استيراد</button>
          <button type="button" className="secondary-action" onClick={exportJson}>تصدير JSON</button>
          <button type="button" className="admin-save" onClick={savePreview}>{dirty ? "حفظ المعاينة •" : "المعاينة محفوظة"}</button>
        </div>
      </div>

      {notice && <div className="admin-notice" role="status">{notice}</div>}

      <section className="admin-content">
        {section === "products" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">النكهات</span><h2>المنتجات والصور</h2><p>اسم النكهة وصورتها ووصفها تظهر مباشرة في واجهة الطلب.</p></div>
              <button type="button" className="add-button" onClick={addProduct}>+ إضافة منتج</button>
            </div>
            <div className="product-editor-list">
              {content.products.map((product, index) => (
                <article className="product-editor" key={product.id}>
                  <div className="product-editor-image">
                    <img src={product.image} alt={product.name} />
                    <label className="upload-image">
                      تغيير الصورة
                      <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && uploadProductImage(index, event.target.files[0])} />
                    </label>
                  </div>
                  <div className="editor-fields">
                    <div className="field-row field-row--wide">
                      <label><span>اسم المنتج</span><input dir="ltr" value={product.name} onChange={(event) => updateProduct(index, { name: event.target.value })} /></label>
                      <label><span>معرّف المنتج</span><input dir="ltr" value={product.id} onChange={(event) => updateProduct(index, { id: event.target.value })} /></label>
                    </div>
                    <label><span>الوصف القصير</span><input value={product.description} onChange={(event) => updateProduct(index, { description: event.target.value })} /></label>
                    <label><span>مسار الصورة أو الرابط</span><input dir="ltr" value={product.image.startsWith("data:") ? "صورة مرفوعة داخل JSON" : product.image} disabled={product.image.startsWith("data:")} onChange={(event) => updateProduct(index, { image: event.target.value })} /></label>
                    <div className="field-row">
                      <label><span>السعر</span><input type="number" min="0" value={product.price ?? ""} placeholder="غير محدد" onChange={(event) => updateProduct(index, { price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                      <label><span>الفئة</span><input dir="ltr" value={product.category} onChange={(event) => updateProduct(index, { category: event.target.value })} /></label>
                      <label><span>النسخة</span><input dir="ltr" value={product.variant} onChange={(event) => updateProduct(index, { variant: event.target.value })} /></label>
                      <label className="color-field"><span>لون مميز</span><input type="color" value={product.accent} onChange={(event) => updateProduct(index, { accent: event.target.value })} /></label>
                    </div>
                    <div className="editor-footer">
                      <label className="toggle-field"><input type="checkbox" checked={product.available} onChange={(event) => updateProduct(index, { available: event.target.checked })} /><span>متوفر في المتجر</span></label>
                      <button type="button" className="danger-link" onClick={() => removeProduct(index)}>حذف المنتج</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {section === "boxes" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">أحجام الطلب</span><h2>البوكسات</h2><p>أضف أي حجم وحدد سعته وسعره، وسيظهر تلقائياً للزبون.</p></div>
              <button type="button" className="add-button" onClick={addBox}>+ إضافة بوكس</button>
            </div>
            <div className="box-editor-grid">
              {content.boxes.map((box, index) => (
                <article className="box-editor-card" key={box.id}>
                  <div className="mini-box-visual"><span>{box.capacity}</span><small>COOKIES</small></div>
                  <div className="field-row">
                    <label><span>اسم البوكس</span><input dir="ltr" value={box.name} onChange={(event) => updateBox(index, { name: event.target.value })} /></label>
                    <label><span>المعرّف</span><input dir="ltr" value={box.id} onChange={(event) => updateBox(index, { id: event.target.value })} /></label>
                  </div>
                  <div className="field-row">
                    <label><span>عدد القطع</span><input type="number" min="1" max="8" value={box.capacity} onChange={(event) => updateBox(index, { capacity: Math.max(1, Math.min(8, Number(event.target.value))) })} /></label>
                    <label><span>السعر (د.ل)</span><input type="number" min="0" value={box.price} onChange={(event) => updateBox(index, { price: Number(event.target.value) })} /></label>
                  </div>
                  <label><span>الوصف</span><textarea rows={2} value={box.description} onChange={(event) => updateBox(index, { description: event.target.value })} /></label>
                  <div className="editor-footer">
                    <label className="toggle-field"><input type="checkbox" checked={box.enabled} onChange={(event) => updateBox(index, { enabled: event.target.checked })} /><span>ظاهر في المتجر</span></label>
                    <button type="button" className="danger-link" onClick={() => removeBox(index)}>حذف البوكس</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {section === "settings" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">هوية وتشغيل</span><h2>إعدادات المتجر</h2><p>تحكم في حالة الطلبات، الساعات، المدن، ونص الواجهة.</p></div>
            </div>
            <div className="settings-grid">
              <article className="settings-card">
                <h3>استقبال الطلبات</h3>
                <label className="toggle-field toggle-field--large"><input type="checkbox" checked={content.store.orderingEnabled} onChange={(event) => update({ ...content, store: { ...content.store, orderingEnabled: event.target.checked } })} /><span>{content.store.orderingEnabled ? "الطلبات مفعّلة" : "الطلبات متوقفة"}</span></label>
                <div className="field-row">
                  <label><span>من الساعة</span><input type="time" value={content.store.openingTime} onChange={(event) => update({ ...content, store: { ...content.store, openingTime: event.target.value } })} /></label>
                  <label><span>إلى الساعة</span><input type="time" value={content.store.closingTime} onChange={(event) => update({ ...content, store: { ...content.store, closingTime: event.target.value } })} /></label>
                </div>
                <label><span>عنوان التوقف</span><input value={content.store.closedMessage} onChange={(event) => update({ ...content, store: { ...content.store, closedMessage: event.target.value } })} /></label>
                <label><span>وصف التوقف</span><input value={content.store.closedDescription} onChange={(event) => update({ ...content, store: { ...content.store, closedDescription: event.target.value } })} /></label>
              </article>
              <article className="settings-card">
                <h3>واجهة البراند</h3>
                <label><span>العنوان الرئيسي</span><input value={content.brand.heroTitle} onChange={(event) => update({ ...content, brand: { ...content.brand, heroTitle: event.target.value } })} /></label>
                <label><span>النص القصير</span><textarea rows={3} value={content.brand.heroText} onChange={(event) => update({ ...content, brand: { ...content.brand, heroText: event.target.value } })} /></label>
                <label><span>الشعار الإنجليزي</span><input dir="ltr" value={content.brand.slogan} onChange={(event) => update({ ...content, brand: { ...content.brand, slogan: event.target.value } })} /></label>
                <label><span>مسار صورة الفرشة</span><input dir="ltr" value={content.brand.linerImage} onChange={(event) => update({ ...content, brand: { ...content.brand, linerImage: event.target.value } })} /></label>
              </article>
              <article className="settings-card">
                <h3>المدن</h3>
                <label><span>مدينة في كل سطر</span><textarea rows={8} value={content.store.cities.join("\n")} onChange={(event) => update({ ...content, store: { ...content.store, cities: event.target.value.split("\n").map((city) => city.trim()).filter(Boolean) } })} /></label>
              </article>
              <article className="settings-card">
                <h3>روابط التواصل</h3>
                {(["instagram", "facebook", "tiktok"] as const).map((network) => (
                  <label key={network}><span dir="ltr">{network}</span><input dir="ltr" placeholder="أضف الرابط عند توفره" value={content.store.social[network]} onChange={(event) => update({ ...content, store: { ...content.store, social: { ...content.store.social, [network]: event.target.value } } })} /></label>
                ))}
              </article>
            </div>
          </>
        )}

        {section === "json" && (
          <div className="json-panel">
            <div className="admin-section-title">
              <div><span className="eyebrow">جاهز لـ GitHub</span><h2>ملف بيانات المتجر</h2><p>نزّل الملف وضعه مكان <span dir="ltr">data/store.json</span> في المستودع، وسيعيد Vercel النشر تلقائياً.</p></div>
              <button type="button" className="add-button" onClick={exportJson}>تنزيل store.json</button>
            </div>
            <pre dir="ltr">{JSON.stringify(content, null, 2)}</pre>
            <button type="button" className="danger-link reset-link" onClick={resetContent}>استعادة البيانات الأصلية</button>
          </div>
        )}
      </section>
    </main>
  );
}
