"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  defaultContent,
  readLocalContent,
  writeLocalContent,
} from "@/lib/store-content";
import type { BoxSize, Product, Story, StoreContent, CityOption } from "@/lib/types";
import { normalizeCities } from "@/lib/types";

type AdminSection = "products" | "boxes" | "stories" | "settings" | "backup";

export function AdminDashboard() {
  const [content, setContent] = useState<StoreContent>(defaultContent);
  const [section, setSection] = useState<AdminSection>("products");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  async function savePreview() {
    for (const prod of content.products) {
      if (prod.price === null || prod.price === undefined || isNaN(Number(prod.price)) || Number(prod.price) < 0) {
        setShowConfirmModal(false);
        flash(`يجب أن تحدد سعر المنتج "${prod.name || "بدون اسم"}"`);
        return;
      }
    }

    setShowConfirmModal(false);
    writeLocalContent(content);
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "تعذر نشر التغييرات");
      setDirty(false);
      flash(data.message || "تم رفع التغييرات وبدأ تحديث الموقع.");
    } catch (saveError) {
      flash(saveError instanceof Error ? saveError.message : "تعذر رفع التغييرات.");
    } finally {
      setPublishing(false);
    }
  }

  function addProduct() {
    const id = `product-${Date.now().toString(36)}`;
    const product: Product = {
      id,
      name: "اكتب اسم الصنف هنا",
      description: "اكتب وصف الصنف والمكونات هنا",
      image: "/brand/crumble-logo.png",
      price: 12,
      available: true,
      category: "new",
      variant: "signature",
      accent: "#aa7858",
    };
    update({ ...content, products: [...content.products, product] });
    window.setTimeout(() => {
      const elements = document.querySelectorAll(".product-editor");
      const lastElement = elements[elements.length - 1];
      if (lastElement) {
        lastElement.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    }, 80);
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
      name: "اكتب اسم البوكس هنا",
      capacity: 4,
      price: 0,
      enabled: true,
      description: "اكتب وصف البوكس وتفاصيله هنا",
    };
    update({ ...content, boxes: [...content.boxes, box] });
    window.setTimeout(() => {
      const elements = document.querySelectorAll(".box-editor-card");
      const lastElement = elements[elements.length - 1];
      if (lastElement) {
        lastElement.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    }, 80);
  }

  function updateBox(index: number, changes: Partial<BoxSize>) {
    const boxes = content.boxes.map((box, boxIndex) => boxIndex === index ? { ...box, ...changes } : box);
    update({ ...content, boxes });
  }

  function removeBox(index: number) {
    update({ ...content, boxes: content.boxes.filter((_, boxIndex) => boxIndex !== index) });
  }

  function addStory() {
    const stories = content.stories ?? [];
    const story: Story = {
      id: `story-${Date.now().toString(36)}`,
      title: "اكتب عنوان العرض هنا",
      titleAr: "اكتب عنوان العرض هنا",
      caption: "اكتب تفاصيل العرض هنا",
      captionAr: "اكتب تفاصيل العرض هنا",
      image: "/brand/crumble-logo.png",
      enabled: true,
    };
    update({ ...content, stories: [...stories, story] });
    window.setTimeout(() => {
      const elements = document.querySelectorAll(".product-editor");
      const lastElement = elements[elements.length - 1];
      if (lastElement) {
        lastElement.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    }, 80);
  }

  function updateStory(index: number, changes: Partial<Story>) {
    const stories = (content.stories ?? []).map((story, storyIndex) =>
      storyIndex === index ? { ...story, ...changes } : story,
    );
    update({ ...content, stories });
  }

  function removeStory(index: number) {
    const stories = (content.stories ?? []).filter((_, storyIndex) => storyIndex !== index);
    update({ ...content, stories });
  }

  function uploadProductImage(index: number, file: File) {
    if (file.size > 3_500_000) {
      flash("حجم الصورة كبير جداً، يفضل اختيار صورة أقل من 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateProduct(index, { image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function uploadStoryImage(index: number, file: File) {
    if (file.size > 3_500_000) {
      flash("حجم الصورة كبير جداً، يفضل اختيار صورة أقل من 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateStory(index, { image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  const normalizedCities = normalizeCities(content.store.cities);

  function addCity() {
    const newCity: CityOption = {
      id: `city-${Date.now().toString(36)}`,
      name: "اسم المدينة جديدة",
      deliveryFee: 10,
      estimatedTime: "خلال 24 - 48 ساعة",
    };
    update({
      ...content,
      store: {
        ...content.store,
        cities: [...normalizedCities, newCity],
      },
    });
  }

  function updateCity(index: number, changes: Partial<CityOption>) {
    const cities = normalizedCities.map((city, cityIndex) =>
      cityIndex === index ? { ...city, ...changes } : city
    );
    update({
      ...content,
      store: {
        ...content.store,
        cities,
      },
    });
  }

  function removeCity(index: number) {
    const cities = normalizedCities.filter((_, cityIndex) => cityIndex !== index);
    update({
      ...content,
      store: {
        ...content.store,
        cities,
      },
    });
  }

  return (
    <main className="admin-shell" dir="rtl">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/">
          <img src={content.brand.logo} alt="شعار Crumble" />
          <span><b>CRUMBLE</b><small>لوحة التحكم</small></span>
        </Link>
        <Link className="preview-link" href="/">عرض المتجر <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="admin-hero">
        <div>
          <span className="eyebrow">إدارة محتوى المتجر</span>
          <h1>لوحة تحكم بسيطة ومباشرة.</h1>
          <p>تعديل المنتجات، الصور، البوكسات والستوريات وحفظ التغييرات مباشرة.</p>
        </div>
        <div className="admin-stats">
          <div><strong>{content.products.length}</strong><span>منتجات</span></div>
          <div><strong>{content.boxes.length}</strong><span>بوكسات</span></div>
          <div><strong>{content.stories?.length ?? 0}</strong><span>ستوريات</span></div>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="أقسام لوحة التحكم">
          {([
            ["products", "الأصناف"],
            ["boxes", "البوكسات"],
            ["stories", "الستوريات"],
            ["settings", "الإعدادات"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={section === id ? "is-active" : ""} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {notice && <div className="admin-notice" role="status">{notice}</div>}

      <section className="admin-content">
        {section === "products" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">الأصناف</span><h2>المنتجات والأصناف</h2><p>اسم الصنف وصورته ووصفه تظهر مباشرة في واجهة الطلب.</p></div>
            </div>
            <div className="product-editor-list">
              {content.products.map((product, index) => (
                <article className="product-editor" key={product.id}>
                  <div className="product-editor-media">
                    <div className="product-editor-image">
                      <img src={product.image} alt={product.name} />
                    </div>
                    <label className="upload-image">
                      📷 تغيير الصورة
                      <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && uploadProductImage(index, event.target.files[0])} />
                    </label>
                  </div>
                  <div className="editor-fields">
                    <div className="field-row field-row--wide">
                      <label><span>اسم الصنف</span><input type="text" value={product.name} onChange={(event) => updateProduct(index, { name: event.target.value })} placeholder="مثال: كوكيز كلاسيك" /></label>
                      <label><span>السعر (د.ل)</span><input type="number" min="0" value={product.price ?? ""} placeholder="يحدد لاحقاً" onChange={(event) => updateProduct(index, { price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                    </div>
                    <label><span>الوصف القصير</span><textarea rows={2} value={product.description} onChange={(event) => updateProduct(index, { description: event.target.value })} placeholder="وصف مكونات الصنف..." /></label>
                    <div className="editor-footer">
                      <div
                        className={`segmented-switch ${product.available ? "is-option1" : "is-option2"}`}
                        onClick={() => updateProduct(index, { available: !product.available })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && updateProduct(index, { available: !product.available })}
                        aria-label="تغيير حالة التوفر"
                      >
                        <span className="segmented-thumb" />
                        <span className={`segmented-label ${product.available ? "is-active" : ""}`}>متوفر</span>
                        <span className={`segmented-label ${!product.available ? "is-active" : ""}`}>غير متوفر</span>
                      </div>
                      <button type="button" className="action-delete-btn" onClick={() => removeProduct(index)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        <span>حذف الصنف</span>
                      </button>
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
              <div><span className="eyebrow">أحجام الطلب</span><h2>البوكسات</h2><p>أضف حجم البوكس وسعته وسعره، وسيظهر للزبون لتخصيصه.</p></div>
            </div>
            <div className="box-editor-grid">
              {content.boxes.map((box, index) => (
                <article className="box-editor-card" key={box.id}>
                  <div className="mini-box-visual"><span>{box.capacity}</span><small>قطع</small></div>
                  <div className="field-row">
                    <label><span>اسم البوكس</span><input type="text" value={box.name} onChange={(event) => updateBox(index, { name: event.target.value })} /></label>
                    <label><span>عدد القطع</span><input type="number" min="1" max="16" value={box.capacity} onChange={(event) => updateBox(index, { capacity: Math.max(1, Math.min(16, Number(event.target.value))) })} /></label>
                  </div>
                  <label><span>السعر (د.ل)</span><input type="number" min="0" value={box.price} onChange={(event) => updateBox(index, { price: Number(event.target.value) })} /></label>
                  <label><span>الوصف</span><textarea rows={2} value={box.description} onChange={(event) => updateBox(index, { description: event.target.value })} /></label>
                  <div className="editor-footer">
                    <div
                      className={`segmented-switch ${box.enabled ? "is-option1" : "is-option2"}`}
                      onClick={() => updateBox(index, { enabled: !box.enabled })}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && updateBox(index, { enabled: !box.enabled })}
                      aria-label="تغيير حالة إظهار البوكس"
                    >
                      <span className="segmented-thumb" />
                      <span className={`segmented-label ${box.enabled ? "is-active" : ""}`}>ظاهر</span>
                      <span className={`segmented-label ${!box.enabled ? "is-active" : ""}`}>مخفي</span>
                    </div>
                    <button type="button" className="action-delete-btn" onClick={() => removeBox(index)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      <span>حذف البوكس</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {section === "stories" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">صور العروض</span><h2>الستوريات</h2><p>تغيير صور الستوري، العناوين، والأوصاف الظاهرة للعملاء.</p></div>
            </div>
            <div className="product-editor-list">
              {(content.stories ?? []).map((story, index) => (
                <article className="product-editor" key={story.id}>
                  <div className="product-editor-media">
                    <div className="product-editor-image">
                      <img src={story.image} alt={story.title ?? ""} />
                    </div>
                    <label className="upload-image">
                      📷 تغيير الصورة
                      <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && uploadStoryImage(index, event.target.files[0])} />
                    </label>
                  </div>
                  <div className="editor-fields">
                    <label><span>عنوان الستوري</span><input type="text" value={story.titleAr || story.title || ""} onChange={(event) => updateStory(index, { titleAr: event.target.value, title: event.target.value })} placeholder="عنوان العرض..." /></label>
                    <label><span>الوصف القصير</span><textarea rows={2} value={story.captionAr || story.caption || ""} onChange={(event) => updateStory(index, { captionAr: event.target.value, caption: event.target.value })} placeholder="تفاصيل العرض..." /></label>
                    <div className="editor-footer">
                      <div
                        className={`segmented-switch ${story.enabled !== false ? "is-option1" : "is-option2"}`}
                        onClick={() => updateStory(index, { enabled: story.enabled === false })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && updateStory(index, { enabled: story.enabled === false })}
                        aria-label="تغيير حالة إظهار الستوري"
                      >
                        <span className="segmented-thumb" />
                        <span className={`segmented-label ${story.enabled !== false ? "is-active" : ""}`}>ظاهر</span>
                        <span className={`segmented-label ${story.enabled === false ? "is-active" : ""}`}>مخفي</span>
                      </div>
                      <button type="button" className="action-delete-btn" onClick={() => removeStory(index)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        <span>حذف الستوري</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {section === "settings" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">إداريات</span><h2>إعدادات المتجر</h2><p>حالة استقبال الطلبات، الساعات، والمدن.</p></div>
            </div>
            <div className="settings-grid">
              <article className="settings-card">
                <h3>استقبال الطلبات</h3>
                <label className="toggle-field toggle-field--large"><input type="checkbox" checked={content.store.orderingEnabled} onChange={(event) => update({ ...content, store: { ...content.store, orderingEnabled: event.target.checked } })} /><span>{content.store.orderingEnabled ? "الطلبات مفعّلة حالياً" : "الطلبات متوقفة مؤقتاً"}</span></label>
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
              </article>
              <article className="settings-card settings-card--wide">
                <div className="settings-card-header">
                  <div>
                    <h3>المدن المتاحة وأسعار التوصيل</h3>
                    <p>أضف المدينة وحدد سعر التوصيل ومدة التوصيل لكل مدينة.</p>
                  </div>
                  <button type="button" className="add-button-sm" onClick={addCity}>+ إضافة مدينة جديدة</button>
                </div>
                <div className="city-editor-list">
                  {normalizedCities.map((city, index) => (
                    <div className="city-editor-card" key={city.id || index}>
                      <div className="field-row">
                        <label>
                          <span>اسم المدينة</span>
                          <input type="text" value={city.name} onChange={(e) => updateCity(index, { name: e.target.value })} placeholder="مثال: طرابلس" />
                        </label>
                        <label>
                          <span>سعر التوصيل (د.ل)</span>
                          <input type="number" min="0" value={city.deliveryFee} onChange={(e) => updateCity(index, { deliveryFee: Number(e.target.value) })} />
                        </label>
                        <label>
                          <span>مدة التوصيل المحتملة</span>
                          <input type="text" value={city.estimatedTime} onChange={(e) => updateCity(index, { estimatedTime: e.target.value })} placeholder="مثال: خلال 24 ساعة" />
                        </label>
                      </div>
                      <button type="button" className="action-delete-btn-sm" onClick={() => removeCity(index)} title="حذف المدينة">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        <span>حذف</span>
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </>
        )}
      </section>

      {/* Floating Add Item Button (Bottom Right) */}
      {section !== "settings" && section !== "backup" && (
        <button
          type="button"
          className="admin-fab-add"
          onClick={() => {
            if (section === "products") addProduct();
            else if (section === "boxes") addBox();
            else if (section === "stories") addStory();
          }}
          title={
            section === "products"
              ? "إضافة صنف جديد"
              : section === "boxes"
              ? "إضافة بوكس جديد"
              : "إضافة ستوري جديد"
          }
          aria-label="إضافة صنف جديد"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      )}

      {/* Floating Save Action Symbol Icon (Bottom Left) */}
      <button
        type="button"
        className={`admin-fab-save ${dirty ? "is-dirty" : "is-clean"}`}
        onClick={() => setShowConfirmModal(true)}
        disabled={publishing}
        title="حفظ ونشر التعديلات"
        aria-label="حفظ ونشر التعديلات"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {dirty && <span className="fab-badge" title="تغيرات غير محفوظة" />}
      </button>

      {/* Confirmation Modal Overlay & Card */}
      {showConfirmModal && (
        <div className="admin-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="admin-modal-header">
              <div className="admin-modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D1A10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </div>
              <h3>تأكيد حفظ ونشر التغييرات</h3>
            </div>
            <p className="admin-modal-body">
              هل أنت متأكد أنك تريد حفظ ونشر التغييرات الجديدة على الأصناف والموقع؟
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-confirm"
                onClick={savePreview}
                disabled={publishing}
              >
                {publishing ? "جارٍ الحفظ..." : "نعم، احفظ وانشر التغييرات"}
              </button>
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={publishing}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
