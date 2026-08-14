import type { StoreContent } from "@/lib/types";

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getStoreStatus(config: StoreContent["store"], now = new Date()) {
  if (!config.orderingEnabled) {
    return {
      isOpen: false,
      title: config.closedMessage,
      description: config.closedDescription,
    };
  }

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const current = minutesFromTime(time);
  const opening = minutesFromTime(config.openingTime);
  const closing = minutesFromTime(config.closingTime);
  const withinHours =
    opening <= closing
      ? current >= opening && current <= closing
      : current >= opening || current <= closing;

  return withinHours
    ? { isOpen: true, title: "الطلبات مفتوحة", description: "نخبز طلبك بكل حب." }
    : {
        isOpen: false,
        title: "طلبات اليوم متوقفة حالياً",
        description: `نستقبل الطلبات من ${config.openingTime} إلى ${config.closingTime}.`,
      };
}
