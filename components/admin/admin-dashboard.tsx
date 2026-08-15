"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  defaultContent,
  readLocalContent,
  writeLocalContent,
} from "@/lib/store-content";
import type { BoxSize, Product, Story, StoreContent } from "@/lib/types";

type AdminSection = "products" | "boxes" | "stories" | "settings" | "backup";

export function AdminDashboard() {
  const [content, setContent] = useState<StoreContent>(defaultContent);
  const [section, setSection] = useState<AdminSection>("products");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
      name: "نكهة جديدة",
      description: "وصف قصير للنكهة.",
      image: "/products/crumble-classic.jpg",
      price: null,
      available: true,
      category: "new",
      variant: "signature",
      accent: "#aa7858",
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

  function addStory() {
    const stories = content.stories ?? [];
    const story: Story = {
      id: `story-${Date.now().toString(36)}`,
      title: "ستوري جديد",
      titleAr: "ستوري جديد",
      caption: "وصف الستوري الجديد",
      captionAr: "وصف الستوري الجديد",
      image: "/stories/story-1.jpg",
      enabled: true,
    };
    update({ ...content, stories: [...stories, story] });
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
            ["products", "المنتجات والنكهات"],
            ["boxes", "البوكسات"],
            ["stories", "الستوريات"],
            ["settings", "إعدادات المتجر"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={section === id ? "is-active" : ""} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className={`admin-save ${dirty ? "is-dirty" : "is-disabled"}`}
            onClick={savePreview}
            disabled={!dirty || publishing}
          >
            {publishing ? "جارٍ النشر..." : "حفظ ونشر التغييرات"}
          </button>
        </div>
      </div>

      {notice && <div className="admin-notice" role="status">{notice}</div>}

      <section className="admin-content">
        {section === "products" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">النكهات</span><h2>المنتجات والصور</h2><p>اسم النكهة وصورتها ووصفها تظهر مباشرة في واجهة الطلب.</p></div>
              <button type="button" className="add-button" onClick={addProduct}>+ إضافة نكهة جديدة</button>
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
                      <label><span>اسم النكهة</span><input value={product.name} onChange={(event) => updateProduct(index, { name: event.target.value })} placeholder="مثال: Crumble Classic" /></label>
                      <label><span>السعر (د.ل)</span><input type="number" min="0" value={product.price ?? ""} placeholder="يحدد لاحقاً" onChange={(event) => updateProduct(index, { price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                    </div>
                    <label><span>الوصف القصير</span><input value={product.description} onChange={(event) => updateProduct(index, { description: event.target.value })} placeholder="وصف مكونات النكهة..." /></label>
                    <div className="editor-footer">
                      <label className="toggle-field"><input type="checkbox" checked={product.available} onChange={(event) => updateProduct(index, { available: event.target.checked })} /><span>متوفر في المتجر</span></label>
                      <button type="button" className="danger-link" onClick={() => removeProduct(index)}>حذف النكهة</button>
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
              <button type="button" className="add-button" onClick={addBox}>+ إضافة بوكس جديد</button>
            </div>
            <div className="box-editor-grid">
              {content.boxes.map((box, index) => (
                <article className="box-editor-card" key={box.id}>
                  <div className="mini-box-visual"><span>{box.capacity}</span><small>قطع</small></div>
                  <div className="field-row">
                    <label><span>اسم البوكس</span><input value={box.name} onChange={(event) => updateBox(index, { name: event.target.value })} /></label>
                    <label><span>عدد القطع</span><input type="number" min="1" max="16" value={box.capacity} onChange={(event) => updateBox(index, { capacity: Math.max(1, Math.min(16, Number(event.target.value))) })} /></label>
                  </div>
                  <label><span>السعر (د.ل)</span><input type="number" min="0" value={box.price} onChange={(event) => updateBox(index, { price: Number(event.target.value) })} /></label>
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

        {section === "stories" && (
          <>
            <div className="admin-section-title">
              <div><span className="eyebrow">صور العروض</span><h2>الستوريات</h2><p>تغيير صور الستوري، العناوين، والأوصاف الظاهرة للعملاء.</p></div>
              <button type="button" className="add-button" onClick={addStory}>+ إضافة ستوري جديد</button>
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
                    <label><span>عنوان الستوري</span><input value={story.titleAr || story.title || ""} onChange={(event) => updateStory(index, { titleAr: event.target.value, title: event.target.value })} placeholder="عنوان العرض..." /></label>
                    <label><span>الوصف القصير</span><input value={story.captionAr || story.caption || ""} onChange={(event) => updateStory(index, { captionAr: event.target.value, caption: event.target.value })} placeholder="تفاصيل العرض..." /></label>
                    <div className="editor-footer">
                      <label className="toggle-field"><input type="checkbox" checked={story.enabled !== false} onChange={(event) => updateStory(index, { enabled: event.target.checked })} /><span>ظاهر في الستوريات</span></label>
                      <button type="button" className="danger-link" onClick={() => removeStory(index)}>حذف الستوري</button>
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
              <article className="settings-card">
                <h3>المدن المتاحة للتوصيل</h3>
                <label><span>مدينة في كل سطر</span><textarea rows={8} value={content.store.cities.join("\n")} onChange={(event) => update({ ...content, store: { ...content.store, cities: event.target.value.split("\n").map((city) => city.trim()).filter(Boolean) } })} /></label>
              </article>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
