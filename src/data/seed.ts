import type { BookingStatus } from "@/lib/status";

export type Court = {
  id: string;
  name: string;
  surface: "Indoor" | "Outdoor";
  hourlyRate: number;
  status: "active" | "maintenance";
};

export type Membership = "VIP" | "Regular";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  membership: Membership;
  totalBookings: number;
  totalSpend: number;
  notes?: string;
  joinedISO: string;
};

export type PaymentMethod = "JazzCash" | "EasyPaisa" | "Bank Transfer" | "Card" | "Cash";

export type Payment = {
  id: string;
  bookingId: string;
  method: PaymentMethod;
  amount: number;
  transactionId: string;
  screenshotColor: string; // stand-in for a real screenshot
  submittedISO: string;
  status: "pending" | "verified" | "rejected";
};

export type Booking = {
  id: string;
  customerId: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  amount: number;
  status: BookingStatus;
  paymentId?: string;
  createdISO: string;
};

export type Activity = {
  id: string;
  kind: "booking" | "payment" | "checkin" | "cancel" | "customer" | "maintenance";
  message: string;
  at: string; // ISO
};

export type MaintenanceSlot = {
  id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  reason?: string;
};

// Deterministic PRNG for stable mock data
const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const R = rand(2028);
const pick = <T,>(arr: T[]) => arr[Math.floor(R() * arr.length)];

const FIRST = [
  "Ahmed", "Zainab", "Hassan", "Ayesha", "Bilal", "Fatima", "Usman", "Hira",
  "Kamran", "Sana", "Faisal", "Mariam", "Umer", "Nida", "Danish", "Rabia",
  "Imran", "Saba", "Adnan", "Iman", "Zeeshan", "Anum", "Yasir", "Komal",
  "Salman", "Nimra", "Waqas", "Sadia", "Junaid", "Areeba", "Talha", "Mahnoor",
  "Sohail", "Laiba", "Rizwan", "Amna", "Nabeel", "Zoya", "Haris", "Eshaal",
];
const LAST = [
  "Raza", "Sheikh", "Khan", "Malik", "Qureshi", "Iqbal", "Ahmed", "Butt",
  "Chaudhry", "Siddiqui", "Farooqi", "Abbasi", "Rashid", "Javed", "Hussain",
  "Tariq", "Kazmi", "Baig", "Nawaz", "Zafar",
];

const customerNotes = [
  "Prefers Court 2 in the evening.",
  "Corporate account — invoice monthly.",
  "Coach: schedules doubles most weekends.",
  "VIP — allow late checkout when possible.",
  undefined,
  undefined,
  "Left racquet at reception on last visit.",
  "Requests indoor courts only.",
];

export const seedCourts = (): Court[] => [
  { id: "C-01", name: "Court 1 — Padel", surface: "Indoor", hourlyRate: 3500, status: "active" },
  { id: "C-02", name: "Court 2 — Glass", surface: "Indoor", hourlyRate: 3200, status: "active" },
  { id: "C-03", name: "Court 3 — Pickle", surface: "Indoor", hourlyRate: 2800, status: "active" },
  { id: "C-04", name: "Court 4 — Basketball", surface: "Outdoor", hourlyRate: 2800, status: "active" },
];

const seedCustomers = (): Customer[] => {
  const used = new Set<string>();
  const out: Customer[] = [];
  for (let i = 0; i < 40; i++) {
    let name = "";
    while (!name || used.has(name)) {
      name = `${pick(FIRST)} ${pick(LAST)}`;
    }
    used.add(name);
    const membership: Membership =
      i < 10 ? "VIP" : "Regular";
    const totalBookings = Math.floor(R() * (membership === "VIP" ? 60 : 20)) + 1;
    const daysAgo = Math.floor(R() * 400) + 5;
    out.push({
      id: `U-${String(1000 + i)}`,
      name,
      phone: `+92 3${Math.floor(R() * 5) + 1}${Math.floor(R() * 9)} ${Math.floor(R() * 9000000 + 1000000)}`,
      email: `${name.toLowerCase().replace(/\s/g, ".")}@mail.pk`,
      membership,
      totalBookings,
      totalSpend: totalBookings * (2800 + Math.floor(R() * 900)),
      notes: pick(customerNotes),
      joinedISO: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
  }
  return out;
};

const HOURS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];

const seedBookings = (courts: Court[], customers: Customer[]): { bookings: Booking[]; payments: Payment[] } => {
  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 200 bookings across ±14 days
  for (let i = 0; i < 200; i++) {
    const dayOffset = Math.floor(R() * 28) - 14;
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    const dateISO = d.toISOString().slice(0, 10);
    const court = pick(courts);
    const customer = pick(customers);
    // Peak weight
    const hourIdx =
      R() < 0.6
        ? 10 + Math.floor(R() * 5) // 17-21
        : Math.floor(R() * HOURS.length);
    const startTime = HOURS[Math.min(hourIdx, HOURS.length - 2)];
    const endTime = HOURS[Math.min(hourIdx + 1, HOURS.length - 1)];
    const amount = court.hourlyRate;

    let status: BookingStatus;
    if (dayOffset < -1) {
      status = R() < 0.9 ? "completed" : "cancelled";
    } else if (dayOffset < 0) {
      status = R() < 0.85 ? "completed" : R() < 0.5 ? "cancelled" : "checked_in";
    } else if (dayOffset === 0) {
      const r = R();
      status =
        r < 0.15 ? "reserved"
        : r < 0.3 ? "payment_submitted"
        : r < 0.65 ? "booked"
        : r < 0.8 ? "checked_in"
        : r < 0.95 ? "completed"
        : "cancelled";
    } else {
      const r = R();
      status =
        r < 0.25 ? "reserved"
        : r < 0.45 ? "payment_submitted"
        : r < 0.9 ? "booked"
        : "cancelled";
    }

    const id = `B-${String(20250 + i)}`;
    const booking: Booking = {
      id,
      customerId: customer.id,
      courtId: court.id,
      date: dateISO,
      startTime,
      endTime,
      amount,
      status,
      createdISO: new Date(d.getTime() - Math.floor(R() * 86400000 * 5)).toISOString(),
    };

    if (status !== "reserved" && status !== "cancelled") {
      const method: PaymentMethod = pick(["JazzCash", "EasyPaisa", "Bank Transfer", "Card", "Cash"]);
      const pid = `P-${String(90000 + i)}`;
      const pstatus: Payment["status"] =
        status === "payment_submitted" ? "pending" : "verified";
      payments.push({
        id: pid,
        bookingId: id,
        method,
        amount,
        transactionId: `TX${Math.floor(R() * 9e9 + 1e9)}`,
        screenshotColor: pick(["#c2513a", "#274060", "#3e7d5a", "#8a6a2f", "#5b3a7c"]),
        submittedISO: new Date(d.getTime() - Math.floor(R() * 86400000 * 2)).toISOString(),
        status: pstatus,
      });
      booking.paymentId = pid;
    }

    bookings.push(booking);
  }

  // Ensure ~20 pending payments — top up if seed underdelivered
  let pending = payments.filter((p) => p.status === "pending").length;
  const candidates = bookings.filter((b) => b.status === "booked" && b.paymentId);
  let ci = 0;
  while (pending < 20 && ci < candidates.length) {
    const b = candidates[ci++];
    b.status = "payment_submitted";
    const p = payments.find((p) => p.id === b.paymentId);
    if (p) p.status = "pending";
    pending++;
  }

  return { bookings, payments };
};

const seedActivity = (bookings: Booking[], customers: Customer[]): Activity[] => {
  const acts: Activity[] = [];
  const sorted = [...bookings].sort(
    (a, b) => new Date(b.createdISO).getTime() - new Date(a.createdISO).getTime()
  );
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  for (const b of sorted.slice(0, 24)) {
    const kind: Activity["kind"] =
      b.status === "cancelled" ? "cancel"
      : b.status === "checked_in" ? "checkin"
      : b.status === "payment_submitted" ? "payment"
      : "booking";
    const msg =
      kind === "cancel"
        ? `${nameOf(b.customerId)} cancelled ${b.id}`
        : kind === "checkin"
          ? `${nameOf(b.customerId)} checked in for ${b.id}`
          : kind === "payment"
            ? `${nameOf(b.customerId)} submitted payment for ${b.id}`
            : `${nameOf(b.customerId)} reserved ${b.id}`;
    acts.push({ id: `A-${b.id}`, kind, message: msg, at: b.createdISO });
  }
  return acts;
};

const seedRevenueHistory = (bookings: Booking[]): { date: string; revenue: number }[] => {
  const map = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === "completed" || b.status === "checked_in" || b.status === "booked") {
      map.set(b.date, (map.get(b.date) ?? 0) + b.amount);
    }
  }
  const out: { date: string; revenue: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= -3; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, revenue: map.get(iso) ?? 0 });
  }
  return out;
};

export const buildSeed = () => {
  const courts = seedCourts();
  const customers = seedCustomers();
  const { bookings, payments } = seedBookings(courts, customers);
  // Refresh customer totals from bookings
  for (const c of customers) {
    const mine = bookings.filter(
      (b) => b.customerId === c.id && b.status !== "cancelled"
    );
    c.totalBookings = mine.length || c.totalBookings;
    c.totalSpend = mine.reduce((s, b) => s + b.amount, 0) || c.totalSpend;
  }
  const activity = seedActivity(bookings, customers);
  const revenueHistory = seedRevenueHistory(bookings);
  const maintenanceSlots: MaintenanceSlot[] = [];
  return { courts, customers, bookings, payments, activity, revenueHistory, maintenanceSlots };
};

export const HOURS_OF_DAY = HOURS;