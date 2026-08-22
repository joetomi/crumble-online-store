import { defaultContent } from "@/lib/store-content";
import { getStoreStatus } from "@/lib/store-status";
import type { Customer, OrderMode } from "@/lib/types";
import { normalizeAllowedCookieTypes, normalizeCities, normalizeCookieType } from "@/lib/types";

type IncomingOrder = {
  mode?: OrderMode;
  customer?: Customer;
  items?: Array<{ id?: string; quantity?: number }>;
  pieceItems?: Array<{ id?: string; quantity?: number }>;
  boxItems?: Array<{ id?: string; quantity?: number }>;
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
    const locationDescription = (data.customer?.locationDescription ?? "").trim().slice(0, 300);

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
    const normalizeItems = (source: Array<{ id?: string; quantity?: number }> = []) => source.map((item) => ({
      product: item.id ? productMap.get(item.id) : undefined,
      quantity: Math.floor(Number(item.quantity ?? 0)),
    }));
    const pieceItems = normalizeItems(data.pieceItems ?? (data.mode === "pieces" ? data.items : []));
    const boxItems = normalizeItems(data.boxItems ?? (data.mode === "box" ? data.items : []));
    const items = [...pieceItems, ...boxItems];

    if (!items.length || items.some((item) => !item.product || item.quantity < 1 || item.quantity > 50)) {
      return Response.json({ error: "invalid_items" }, { status: 400 });
    }

    const totalPieces = items.reduce((total, item) => total + item.quantity, 0);
    const box = boxItems.length
      ? defaultContent.boxes.find((entry) => entry.enabled && entry.id === data.box?.id)
      : undefined;

    const boxPieceCount = boxItems.reduce((total, item) => total + item.quantity, 0);
    if ((boxItems.length && (!box || boxPieceCount !== box.capacity)) || (!pieceItems.length && !boxItems.length)) {
      return Response.json({ error: "invalid_quantity" }, { status: 400 });
    }

    if (box) {
      const allowedCookieTypes = normalizeAllowedCookieTypes(box.allowedCookieTypes);
      if (boxItems.some(({ product }) => !allowedCookieTypes.includes(normalizeCookieType(product?.cookieType)))) {
        return Response.json({ error: "invalid_box_product" }, { status: 400 });
      }
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!token || !chatId) {
      return Response.json({ error: "ordering_unavailable" }, { status: 503 });
    }

    const orderId = createOrderId();
    const pieceLines = pieceItems.map(({ product, quantity }) => `${escapeHtml(product!.name)} × ${quantity}`).join("\n");
    const boxLines = boxItems.map(({ product, quantity }) => `${escapeHtml(product!.name)} × ${quantity}`).join("\n");
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
    const knownPiecePrices = pieceItems.every(({ product }) => product!.price !== null);
    const piecesTotal = knownPiecePrices ? pieceItems.reduce((total, { product, quantity }) => total + product!.price! * quantity, 0) : null;
    const productsTotal = piecesTotal === null ? null : piecesTotal + (box?.price ?? 0);
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
      data.mode === "mixed" ? "قطع + بوكس" : data.mode === "box" ? "بالبوكس" : "بالقطعة",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "👤 <b>بيانات العميل</b>",
      "",
      `<b>الاسم:</b> ${escapeHtml(name)}`,
      `<b>الهاتف:</b> ${escapeHtml(phone)}`,
      `<b>المدينة:</b> ${escapeHtml(city)}`,
      ...(locationDescription ? [`<b>وصف الموقع:</b> ${escapeHtml(locationDescription)}`] : []),
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "🛍 <b>تفاصيل الطلب</b>",
      "",
      ...(pieceLines ? ["<b>بالقطعة</b>", pieceLines, ""] : []),
      ...(box ? [`<b>${escapeHtml(box.name)}</b>`, boxLines, ""] : []),
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
