import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Booking,
  Court,
  Customer,
  Payment,
  Activity,
  MaintenanceSlot,
} from "@/data/seed";
import type { BookingStatus } from "@/lib/status";

/**
 * Remove all top-level undefined values so Firestore doesn't reject the write.
 * Firestore silently throws on `setDoc(obj)` if any field value is `undefined`.
 */
function cleanDoc<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export async function createBooking(booking: Booking) {
  await setDoc(doc(db, "bookings", booking.id), cleanDoc(booking as unknown as Record<string, unknown>));
}

export async function updateBooking(booking: Booking) {
  await setDoc(doc(db, "bookings", booking.id), cleanDoc(booking as unknown as Record<string, unknown>));
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await updateDoc(doc(db, "bookings", id), { status });
}

export async function deleteBooking(id: string) {
  await deleteDoc(doc(db, "bookings", id));
}

// ─── Courts ─────────────────────────────────────────────────────────────────

export async function addCourt(court: Court) {
  await setDoc(doc(db, "courts", court.id), cleanDoc(court as unknown as Record<string, unknown>));
}

export async function updateCourt(court: Court) {
  await setDoc(doc(db, "courts", court.id), cleanDoc(court as unknown as Record<string, unknown>));
}

export async function deleteCourt(courtId: string) {
  await deleteDoc(doc(db, "courts", courtId));
}

export async function reorderCourts(courts: Court[]) {
  const writes = courts.map((court) =>
    setDoc(doc(db, "courts", court.id), cleanDoc(court as unknown as Record<string, unknown>)),
  );
  await Promise.all(writes);
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function createCustomer(customer: Customer) {
  await setDoc(doc(db, "customers", customer.id), cleanDoc(customer as unknown as Record<string, unknown>));
}

export async function updateCustomer(customer: Customer) {
  await setDoc(doc(db, "customers", customer.id), cleanDoc(customer as unknown as Record<string, unknown>));
}

export async function updateCustomerNotes(customerId: string, notes: string) {
  await updateDoc(doc(db, "customers", customerId), { notes });
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function createPayment(payment: Payment) {
  await setDoc(doc(db, "payments", payment.id), cleanDoc(payment as unknown as Record<string, unknown>));
}

export async function verifyPayment(paymentId: string) {
  await updateDoc(doc(db, "payments", paymentId), { status: "verified" });
}

export async function rejectPayment(paymentId: string) {
  await updateDoc(doc(db, "payments", paymentId), { status: "rejected" });
}

// ─── Activity ────────────────────────────────────────────────────────────────

export async function pushActivity(activity: Activity) {
  await setDoc(doc(db, "activity", activity.id), cleanDoc(activity as unknown as Record<string, unknown>));
}

// ─── Maintenance Slots ───────────────────────────────────────────────────────

export async function createMaintenanceSlot(slot: MaintenanceSlot) {
  await setDoc(doc(db, "maintenanceSlots", slot.id), cleanDoc(slot as unknown as Record<string, unknown>));
}

export async function deleteMaintenanceSlot(slotId: string) {
  await deleteDoc(doc(db, "maintenanceSlots", slotId));
}