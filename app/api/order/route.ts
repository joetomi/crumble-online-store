import { defaultContent } from "@/lib/store-content";
import { getStoreStatus } from "@/lib/store-status";
import type { Customer, OrderMode } from "@/lib/types";
import { normalizeCities } from "@/lib/types";

type IncomingOrder = {
  mode?: OrderMode;
  customer?: Customer;
  items?: Array<{ id?: string; quantity?: number }>;
  box?: { id?: string };
};

function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character] ?? character);
}

function createOrderId() {
  const time = Date.now().toString(36).slice(-5).toUpperCase();
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${time}-${random}`;
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as IncomingOrder;
    const name = data.customer?.name?.trim() ?? "";
    const phone = data.customer?.phone?.trim() ?? "";
    const city = data.customer?.city?.trim() ?? "";

    if (!data.mode || !name || phone.replace(/\D/g, "").length < 8 || !city) {
      return Response.json({ error: "invalid_order" }, { status: 400 });
    }
    const validCities = normalizeCities(defaultContent.store.cities);
    if (!validCities.some((c) => c.name === city)) {
      return Response.json({ error: "invalid_city" }, { status: 400 });
    }

    const storeStatus = getStoreStatus(defaultContent.store);
    if (!storeStatus.isOpen) {
      return Response.json({ error: "ordering_closed" }, { status: 409 });
    }

    const productMap = new Map(
      defaultContent.products.filter((product) => product.available).map((product) => [product.id, product]),
    );
    const items = (data.items ?? []).map((item) => ({
      product: item.id ? productMap.get(item.id) : undefined,
      quantity: Math.floor(Number(item.quantity ?? 0)),
    }));

    if (!items.length || items.some((item) => !item.product || item.quantity < 1 || item.quantity > 50)) {
      return Response.json({ error: "invalid_items" }, { status: 400 });
    }

    const totalPieces = items.reduce((total, item) => total + item.quantity, 0);
    const box = data.mode === "box"
      ? defaultContent.boxes.find((entry) => entry.enabled && entry.id === data.box?.id)
      : undefined;

    if ((data.mode === "box" && (!box || totalPieces !== box.capacity)) || (data.mode === "pieces" && totalPieces < 1)) {
      return Response.json({ error: "invalid_quantity" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!token || !chatId) {
      return Response.json({ error: "ordering_unavailable" }, { status: 503 });
    }

    const orderId = createOrderId();
    const itemLines = items.map(({ product, quantity }) => `${escapeHtml(product!.name)} × ${quantity}`).join("\n");
    const orderDate = new Intl.DateTimeFormat("en-GB", {
      timeZone: defaultContent.store.timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
    const orderTime = new Intl.DateTimeFormat("ar-LY", {
      timeZone: defaultContent.store.timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
    const knownPiecePrices = items.every(({ product }) => product!.price !== null);
    const productsTotal = data.mode === "box"
      ? box!.price
      : knownPiecePrices
        ? items.reduce((total, { product, quantity }) => total + product!.price! * quantity, 0)
        : null;
    const selectedCity = validCities.find((entry) => entry.name === city)!;
    const grandTotal = productsTotal === null ? null : productsTotal + selectedCity.deliveryFee;

    const text = [
      "🍪 <b>طلب جديد | CRUMBLE</b>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "<b>رقم الطلب</b>",
      `<code>#${orderId}</code>`,
      "",
      "<b>نوع الطلب</b>",
      data.mode === "box" ? "بالبوكس" : "بالقطعة",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "👤 <b>بيانات العميل</b>",
      "",
      `<b>الاسم:</b> ${escapeHtml(name)}`,
      `<b>الهاتف:</b> ${escapeHtml(phone)}`,
      `<b>المدينة:</b> ${escapeHtml(city)}`,
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "🛍 <b>تفاصيل الطلب</b>",
      "",
      ...(box ? [`<b>${escapeHtml(box.name)}</b>`, ""] : []),
      itemLines,
      "",
      `<b>عدد القطع:</b> ${totalPieces}`,
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "💳 <b>ملخص الحساب</b>",
      "",
      `المنتجات: <b>${productsTotal === null ? "يُحدد لاحقاً" : `${productsTotal} ${defaultContent.store.currency}`}</b>`,
      `التوصيل: <b>${selectedCity.deliveryFee} ${defaultContent.store.currency}</b>`,
      "",
      `<b>الإجمالي: ${grandTotal === null ? "يُحدد لاحقاً" : `${grandTotal} ${defaultContent.store.currency}`}</b>`,
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "🕒 <b>وقت الطلب</b>",
      `${orderDate} — ${escapeHtml(orderTime)}`,
    ].join("\n");

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });

    if (!telegramResponse.ok) {
      const telegramError = await telegramResponse.json().catch(() => null) as { description?: string } | null;
      const description = telegramError?.description ?? "Unknown Telegram error";
      console.error("Telegram sendMessage failed", { status: telegramResponse.status, description });
      const error = /chat not found/i.test(description) ? "telegram_chat_not_found" : "telegram_failed";
      return Response.json({ error }, { status: 502 });
    }

    return Response.json({ orderId }, { status: 201 });
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
}
