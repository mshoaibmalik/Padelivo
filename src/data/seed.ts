import type { BookingStatus } from "@/lib/status";

export type Court = {
  id: string;
  name: string;
  surface: "Indoor" | "Outdoor";
  hourlyRate: number;
  status: "active" | "maintenance";
};

export type CustomerType = "Resident" | "Outsider";

export type Customer = {
  id: string;
  name: string;
  phone: string; // WhatsApp number
  email: string;
  customerType: CustomerType;
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
  courtId: string; // Always "C-01"
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  residents: number;
  outsiders: number;
  totalPlayers: number;
  durationHours: number;
  amount: number;
  status: BookingStatus;
  paymentId?: string;
  createdISO: string;
  notes?: string;
};

export type Activity = {
  id: string;
  kind: "booking" | "payment" | "checkin" | "cancel" | "customer" | "maintenance";
  message: string;
  at: string; // ISO
};

export type MaintenanceSlot = {
  id: string;
  courtId: string; // Always "C-01"
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
const pick = <T>(arr: T[]) => arr[Math.floor(R() * arr.length)];

const FIRST = [
  "Ahmed",
  "Zainab",
  "Hassan",
  "Ayesha",
  "Bilal",
  "Fatima",
  "Usman",
  "Hira",
  "Kamran",
  "Sana",
  "Faisal",
  "Mariam",
  "Umer",
  "Nida",
  "Danish",
  "Rabia",
  "Imran",
  "Saba",
  "Adnan",
  "Iman",
  "Zeeshan",
  "Anum",
  "Yasir",
  "Komal",
  "Salman",
  "Nimra",
  "Waqas",
  "Sadia",
  "Junaid",
  "Areeba",
  "Talha",
  "Mahnoor",
  "Sohail",
  "Laiba",
  "Rizwan",
  "Amna",
  "Nabeel",
  "Zoya",
  "Haris",
  "Eshaal",
];
const LAST = [
  "Raza",
  "Sheikh",
  "Khan",
  "Malik",
  "Qureshi",
  "Iqbal",
  "Ahmed",
  "Butt",
  "Chaudhry",
  "Siddiqui",
  "Farooqi",
  "Abbasi",
  "Rashid",
  "Javed",
  "Hussain",
  "Tariq",
  "Kazmi",
  "Baig",
  "Nawaz",
  "Zafar",
];

const customerNotes = [
  "Prefers morning sessions.",
  "Always plays doubles with office colleagues.",
  "Resident from phase 5.",
  "Requests fresh racquets.",
  undefined,
  undefined,
  "Needs receipt printed.",
  "Prefers weekend slots.",
];

export const seedCourts = (): Court[] => [
  { id: "C-01", name: "Main Court", surface: "Indoor", hourlyRate: 500, status: "active" },
];

const seedCustomers = (): Customer[] => {
  const used = new Set<string>();
  const out: Customer[] = [];
  for (let i = 0; i < 100; i++) {
    let name = "";
    while (!name || used.has(name)) {
      name = `${pick(FIRST)} ${pick(LAST)}`;
    }
    used.add(name);
    const customerType: CustomerType = R() < 0.6 ? "Resident" : "Outsider";
    const totalBookings = Math.floor(R() * 15) + 1;
    const daysAgo = Math.floor(R() * 200) + 5;
    out.push({
      id: `U-${String(1000 + i)}`,
      name,
      phone: `+92 3${Math.floor(R() * 5) + 1}${Math.floor(R() * 9)} ${Math.floor(R() * 9000000 + 1000000)}`,
      email: `${name.toLowerCase().replace(/\s/g, ".")}@mail.pk`,
      customerType,
      totalBookings,
      totalSpend: 0, // calculated from seeded bookings later
      notes: pick(customerNotes),
      joinedISO: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
  }
  return out;
};

export const HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

// Helpers for time conversion
const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const minsToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const seedBookings = (
  courts: Court[],
  customers: Customer[],
): { bookings: Booking[]; payments: Payment[] } => {
  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map to keep track of bookings to prevent overlap on the single court
  // key: date (YYYY-MM-DD), value: array of {startMins, endMins}
  const scheduleMap = new Map<string, { start: number; end: number }[]>();

  // Generate 300 bookings across ±30 days
  let bookingIdCounter = 20250;
  let paymentIdCounter = 90000;

  for (let i = 0; i < 300; i++) {
    const customer = pick(customers);

    // Find a non-overlapping slot
    let dateISO = "";
    let startTime = "";
    let endTime = "";
    let durationHours = 1;
    let dayOffset = 0;
    let attempts = 0;
    let foundSlot = false;

    while (!foundSlot && attempts < 50) {
      attempts++;
      dayOffset = Math.floor(R() * 60) - 30; // ±30 days
      const d = new Date(today);
      d.setDate(d.getDate() + dayOffset);
      dateISO = d.toISOString().slice(0, 10);

      // Pick random start time indices
      const startIdx = Math.floor(R() * (HOURS.length - 3)); // up to 3 hours before close
      startTime = HOURS[startIdx];

      // Durations: 1.0, 1.5, 2.0, 2.5, 3.0
      durationHours = pick([1.0, 1.5, 2.0, 2.5, 3.0]);
      const startMins = timeToMins(startTime);
      const endMins = startMins + durationHours * 60;
      endTime = minsToTime(endMins);

      // Check for overlap on this date
      const slots = scheduleMap.get(dateISO) || [];
      const overlap = slots.some((s) => startMins < s.end && endMins > s.start);
      if (!overlap) {
        slots.push({ start: startMins, end: endMins });
        scheduleMap.set(dateISO, slots);
        foundSlot = true;
      }
    }

    if (!foundSlot) continue;

    // Players distribution
    const totalPlayers = pick([2, 4]);
    let residents = 0;
    let outsiders = 0;

    if (customer.customerType === "Resident") {
      residents = Math.floor(R() * totalPlayers) + 1; // at least 1 resident (the booking holder)
      outsiders = totalPlayers - residents;
    } else {
      outsiders = Math.floor(R() * totalPlayers) + 1; // at least 1 outsider
      residents = totalPlayers - outsiders;
    }

    // Pricing calculation: resident = 500, outsider = 1000
    const residentRate = 500;
    const outsiderRate = 1000;
    const amount = (residents * residentRate + outsiders * outsiderRate) * durationHours;

    let status: BookingStatus;
    if (dayOffset < -1) {
      status = R() < 0.95 ? "completed" : "cancelled";
    } else if (dayOffset < 0) {
      status = R() < 0.9 ? "completed" : R() < 0.5 ? "cancelled" : "checked_in";
    } else if (dayOffset === 0) {
      const r = R();
      status =
        r < 0.1
          ? "reserved"
          : r < 0.3
            ? "payment_submitted"
            : r < 0.7
              ? "booked"
              : r < 0.85
                ? "checked_in"
                : r < 0.95
                  ? "completed"
                  : "cancelled";
    } else {
      const r = R();
      status =
        r < 0.2 ? "reserved" : r < 0.4 ? "payment_submitted" : r < 0.9 ? "booked" : "cancelled";
    }

    const bId = `B-${String(bookingIdCounter++)}`;
    const dObj = new Date(today);
    dObj.setDate(dObj.getDate() + dayOffset);
    const booking: Booking = {
      id: bId,
      customerId: customer.id,
      courtId: "C-01",
      date: dateISO,
      startTime,
      endTime,
      residents,
      outsiders,
      totalPlayers,
      durationHours,
      amount,
      status,
      createdISO: new Date(dObj.getTime() - Math.floor(R() * 86400000 * 5)).toISOString(),
    };

    if (status !== "reserved" && status !== "cancelled") {
      const method: PaymentMethod = pick([
        "JazzCash",
        "EasyPaisa",
        "Bank Transfer",
        "Card",
        "Cash",
      ]);
      const pid = `P-${String(paymentIdCounter++)}`;
      const pstatus: Payment["status"] = status === "payment_submitted" ? "pending" : "verified";
      payments.push({
        id: pid,
        bookingId: bId,
        method,
        amount,
        transactionId: `TX${Math.floor(R() * 9e9 + 1e9)}`,
        screenshotColor: pick(["#c2513a", "#274060", "#3e7d5a", "#8a6a2f", "#5b3a7c"]),
        submittedISO: new Date(dObj.getTime() - Math.floor(R() * 86400000 * 2)).toISOString(),
        status: pstatus,
      });
      booking.paymentId = pid;
    }

    bookings.push(booking);
  }

  // Ensure ~15 pending payments are set up
  let pending = payments.filter((p) => p.status === "pending").length;
  const candidates = bookings.filter((b) => b.status === "booked" && b.paymentId);
  let ci = 0;
  while (pending < 15 && ci < candidates.length) {
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
    (a, b) => new Date(b.createdISO).getTime() - new Date(a.createdISO).getTime(),
  );
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  for (const b of sorted.slice(0, 30)) {
    const kind: Activity["kind"] =
      b.status === "cancelled"
        ? "cancel"
        : b.status === "checked_in"
          ? "checkin"
          : b.status === "payment_submitted"
            ? "payment"
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
    const mine = bookings.filter((b) => b.customerId === c.id && b.status !== "cancelled");
    c.totalBookings = mine.length || 0;
    c.totalSpend = mine.reduce((s, b) => s + b.amount, 0) || 0;
  }
  const activity = seedActivity(bookings, customers);
  const revenueHistory = seedRevenueHistory(bookings);
  const maintenanceSlots: MaintenanceSlot[] = [];
  return { courts, customers, bookings, payments, activity, revenueHistory, maintenanceSlots };
};

export const HOURS_OF_DAY = HOURS;
