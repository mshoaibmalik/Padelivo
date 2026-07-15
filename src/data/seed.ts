import type { BookingStatus } from "@/lib/status";

export type Court = {
  id: string;
  name: string;
  surface: "Indoor" | "Outdoor";
  residentPrice: number;
  outsiderPrice: number;
  status: "active" | "maintenance" | "disabled";
  location?: string;
  displayOrder?: number;
  courtColor?: string;
};

export type CustomerType = "Resident" | "Outsider";

export type Customer = {
  id: string;
  name: string;
  phone: string;
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
  screenshotColor: string;
  submittedISO: string;
  status: "pending" | "verified" | "rejected";
};

export type Booking = {
  id: string;
  customerId: string;
  courtId: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  residents: number;
  outsiders: number;
  totalPlayers: number;
  durationHours: number;
  residentPrice: number;
  outsiderPrice: number;
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
  at: string;
};

export type MaintenanceSlot = {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
};

// Pakistani names for customers
const PAKISTANI_FIRST_NAMES = [
  "Ahmed", "Zainab", "Hassan", "Ayesha", "Bilal", "Fatima", "Usman", "Hira",
  "Kamran", "Sana", "Faisal", "Mariam", "Umer", "Nida", "Danish", "Rabia",
  "Imran", "Saba", "Adnan", "Iman", "Zeeshan", "Anum", "Yasir", "Komal",
  "Salman", "Nimra", "Waqas", "Sadia", "Junaid", "Areeba", "Talha", "Mahnoor",
  "Sohail", "Laiba", "Rizwan", "Amna", "Nabeel", "Zoya", "Haris", "Eshaal",
];

const PAKISTANI_LAST_NAMES = [
  "Raza", "Sheikh", "Khan", "Malik", "Qureshi", "Iqbal", "Ahmed", "Butt",
  "Chaudhry", "Siddiqui", "Farooqi", "Abbasi", "Rashid", "Javed", "Hussain",
  "Tariq", "Kazmi", "Baig", "Nawaz", "Zafar",
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

export const seedCourts = (): Court[] => [
  { id: "C-01", name: "Main Court", surface: "Indoor", residentPrice: 500, outsiderPrice: 1000, status: "active", location: "Main Building", displayOrder: 1, courtColor: "#3b82f6" },
  { id: "C-02", name: "Outdoor Court 1", surface: "Outdoor", residentPrice: 400, outsiderPrice: 800, status: "active", location: "North Wing", displayOrder: 2, courtColor: "#10b981" },
  { id: "C-03", name: "Premium Indoor", surface: "Indoor", residentPrice: 700, outsiderPrice: 1200, status: "active", location: "Main Building", displayOrder: 3, courtColor: "#8b5cf6" },
];

const seedCustomers = (): Customer[] => {
  const customers: Customer[] = [];
  const usedNames = new Set<string>();
  
  // Create 12 unique Pakistani customers
  let idCounter = 1000;
  for (let i = 0; i < 12; i++) {
    let name = "";
    do {
      const first = PAKISTANI_FIRST_NAMES[i % PAKISTANI_FIRST_NAMES.length];
      const last = PAKISTANI_LAST_NAMES[Math.floor(i / PAKISTANI_FIRST_NAMES.length) % PAKISTANI_LAST_NAMES.length];
      name = `${first} ${last}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const customerType: CustomerType = i < 7 ? "Resident" : "Outsider";
    const phone = `+92 3${12 + (i % 5)}${10000000 + i * 1111111}`;
    
    customers.push({
      id: `U-${String(idCounter++)}`,
      name,
      phone,
      email: `${name.toLowerCase().replace(/\s/g, ".")}@mail.pk`,
      customerType,
      totalBookings: 0,
      totalSpend: 0,
      notes: i % 3 === 0 ? "Prefers morning sessions" : undefined,
      joinedISO: new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000).toISOString(),
    });
  }
  
  return customers;
};

export const HOURS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

const seedBookings = (courts: Court[], customers: Customer[]): { bookings: Booking[]; payments: Payment[] } => {
  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  
  const todayStr = today.toISOString().slice(0, 10);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  let bookingIdCounter = 20250;
  let paymentIdCounter = 90000;

  // Helper to create a booking
  const createBooking = (
    customer: Customer,
    court: Court,
    date: string,
    startTime: string,
    durationHours: number,
    status: BookingStatus
  ): Booking => {
    const startMins = timeToMins(startTime);
    const endMins = startMins + durationHours * 60;
    const endTime = minsToTime(endMins);
    
    const totalPlayers = customer.customerType === "Resident" ? 2 : 4;
    const residents = customer.customerType === "Resident" ? totalPlayers : 1;
    const outsiders = customer.customerType === "Outsider" ? totalPlayers : 1;
    
    const residentRate = court.residentPrice;
    const outsiderRate = court.outsiderPrice;
    const baseRate = customer.customerType === "Resident" ? residentRate : outsiderRate;
    const amount = baseRate * durationHours;

    const bId = `B-${String(bookingIdCounter++)}`;
    const booking: Booking = {
      id: bId,
      customerId: customer.id,
      courtId: court.id,
      courtName: court.name,
      residentPrice: court.residentPrice,
      outsiderPrice: court.outsiderPrice,
      date,
      startTime,
      endTime,
      residents,
      outsiders,
      totalPlayers,
      durationHours,
      amount,
      status,
      createdISO: new Date().toISOString(),
    };

    // Add payment for non-reserved bookings
    if (status !== "reserved") {
      const method: PaymentMethod = "Cash";
      const pid = `P-${String(paymentIdCounter++)}`;
      const paymentStatus = status === "completed" ? "verified" : "verified";
      payments.push({
        id: pid,
        bookingId: bId,
        method,
        amount,
        transactionId: `TX${String(paymentIdCounter).padStart(10, '0')}`,
        screenshotColor: "#c2513a",
        submittedISO: new Date().toISOString(),
        status: paymentStatus,
      });
      booking.paymentId = pid;
    }

    return booking;
  };

  // Yesterday: 5 completed bookings
  const yesterdayCustomers = [customers[0], customers[1], customers[2], customers[3], customers[4]];
  const yesterdayCourts = [courts[0], courts[1], courts[0], courts[2], courts[1]];
  const yesterdayTimes = ["09:00", "11:00", "14:00", "16:00", "18:00"];
  const yesterdayDurations = [1.0, 1.5, 1.0, 1.5, 1.0];
  
  for (let i = 0; i < 5; i++) {
    bookings.push(createBooking(
      yesterdayCustomers[i],
      yesterdayCourts[i],
      yesterdayStr,
      yesterdayTimes[i],
      yesterdayDurations[i],
      "completed"
    ));
  }

  // Today: 3 bookings (1 reserved, 2 booked)
  const todayCustomers = [customers[5], customers[6], customers[7]];
  const todayCourts = [courts[0], courts[1], courts[2]];
  const todayTimes = ["10:00", "14:00", "18:00"];
  const todayDurations = [1.0, 1.5, 1.0];
  const todayStatuses: BookingStatus[] = ["reserved", "booked", "booked"];
  
  for (let i = 0; i < 3; i++) {
    bookings.push(createBooking(
      todayCustomers[i],
      todayCourts[i],
      todayStr,
      todayTimes[i],
      todayDurations[i],
      todayStatuses[i]
    ));
  }

  // Tomorrow: 4 bookings (2 reserved, 2 booked)
  const tomorrowCustomers = [customers[8], customers[9], customers[10], customers[11]];
  const tomorrowCourts = [courts[0], courts[1], courts[2], courts[0]];
  const tomorrowTimes = ["09:00", "12:00", "15:00", "19:00"];
  const tomorrowDurations = [1.0, 1.5, 1.0, 1.5];
  const tomorrowStatuses: BookingStatus[] = ["reserved", "reserved", "booked", "booked"];
  
  for (let i = 0; i < 4; i++) {
    bookings.push(createBooking(
      tomorrowCustomers[i],
      tomorrowCourts[i],
      tomorrowStr,
      tomorrowTimes[i],
      tomorrowDurations[i],
      tomorrowStatuses[i]
    ));
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