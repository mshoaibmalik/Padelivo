export type BookingStatus =
  "draft" | "reserved" | "payment_submitted" | "booked" | "checked_in" | "completed" | "cancelled";

export const STATUS_META: Record<
  BookingStatus,
  { label: string; bg: string; fg: string; dot: string; order: number }
> = {
  draft: {
    label: "Draft",
    bg: "bg-slate-100 dark:bg-slate-800",
    fg: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
    order: 0,
  },
  reserved: {
    label: "Reserved",
    bg: "bg-status-reserved",
    fg: "text-status-reserved-fg",
    dot: "bg-status-reserved-fg",
    order: 1,
  },
  payment_submitted: {
    label: "Payment Submitted",
    bg: "bg-status-payment",
    fg: "text-status-payment-fg",
    dot: "bg-status-payment-fg",
    order: 2,
  },
  booked: {
    label: "Booked",
    bg: "bg-status-booked",
    fg: "text-status-booked-fg",
    dot: "bg-status-booked-fg",
    order: 3,
  },
  checked_in: {
    label: "Checked In",
    bg: "bg-status-checkedin",
    fg: "text-status-checkedin-fg",
    dot: "bg-status-checkedin-fg",
    order: 4,
  },
  completed: {
    label: "Completed",
    bg: "bg-status-completed",
    fg: "text-status-completed-fg",
    dot: "bg-status-completed-fg",
    order: 5,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-status-cancelled",
    fg: "text-status-cancelled-fg",
    dot: "bg-status-cancelled-fg",
    order: 6,
  },
};

export const nextStatus = (s: BookingStatus): BookingStatus | null => {
  const chain: BookingStatus[] = [
    "reserved",
    "payment_submitted",
    "booked",
    "checked_in",
    "completed",
  ];
  const i = chain.indexOf(s);
  if (i === -1 || i === chain.length - 1) return null;
  return chain[i + 1];
};

export const nextStatusLabel = (s: BookingStatus): string | null => {
  const n = nextStatus(s);
  if (!n) return null;
  const map: Record<BookingStatus, string> = {
    reserved: "Reserve",
    payment_submitted: "Submit Payment",
    booked: "Confirm Booking",
    checked_in: "Check In",
    completed: "Complete",
    cancelled: "Cancel",
  };
  return map[n];
};
