import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { onSnapshot, collection, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  type Booking,
  type Court,
  type Customer,
  type Payment,
  type Activity,
  type MaintenanceSlot,
} from "@/data/seed";
import type { BookingStatus } from "@/lib/status";
import * as FSService from "@/lib/firestore-service";

type State = {
  courts: Court[];
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  activity: Activity[];
  revenueHistory: { date: string; revenue: number }[];
  maintenanceSlots: MaintenanceSlot[];
};

type Action =
  | { type: "set_booking_status"; id: string; status: BookingStatus }
  | { type: "verify_payment"; paymentId: string }
  | { type: "reject_payment"; paymentId: string }
  | { type: "create_booking"; booking: Booking }
  | { type: "update_booking"; booking: Booking }
  | { type: "toggle_court_maintenance"; courtId: string }
  | { type: "update_customer_notes"; customerId: string; notes: string }
  | { type: "update_customer"; customer: Customer }
  | { type: "create_customer"; customer: Customer }
  | { type: "create_maintenance_slot"; slot: MaintenanceSlot }
  | { type: "delete_maintenance_slot"; slotId: string }
  | { type: "create_payment"; payment: Payment }
  | { type: "delete_booking"; id: string }
  | { type: "add_court"; court: Court }
  | { type: "update_court"; court: Court }
  | { type: "delete_court"; courtId: string }
  | { type: "reorder_courts"; courts: Court[] }
  | { type: "hydrate"; collection: keyof Omit<State, "revenueHistory">; items: DocumentData[] };

const INITIAL_STATE: State = {
  courts: [],
  customers: [],
  bookings: [],
  payments: [],
  activity: [],
  revenueHistory: [],
  maintenanceSlots: [],
};

// Reducer only handles `hydrate` — all other actions write to Firestore
// and propagate back via onSnapshot
const reducer = (state: State, action: Action): State => {
  if (action.type === "hydrate") {
    return { ...state, [action.collection]: action.items };
  }
  return state;
};

type Ctx = { state: State; dispatch: React.Dispatch<Action>; loading: boolean };
const ClubCtx = createContext<Ctx | null>(null);

const COLLECTIONS = [
  "courts",
  "customers",
  "bookings",
  "payments",
  "activity",
  "maintenanceSlots",
] as const;

export const ClubProvider = ({ children }: { children: ReactNode }) => {
  const [state, rawDispatch] = useReducer(reducer, INITIAL_STATE);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const unsubs = COLLECTIONS.map((name) =>
      onSnapshot(collection(db, name), (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rawDispatch({ type: "hydrate", collection: name, items });
        setLoaded((prev) => prev + 1);
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  // Wrapped dispatch — writes to Firestore, then onSnapshot auto-updates state
  const dispatch = useCallback(async (action: Action) => {
    // Fire-and-forget to Firestore; onSnapshot will trigger hydrate
    try {
      switch (action.type) {
        case "set_booking_status":
          await FSService.setBookingStatus(action.id, action.status);
          break;
        case "create_booking":
          await FSService.createBooking(action.booking);
          break;
        case "update_booking":
          await FSService.updateBooking(action.booking);
          break;
        case "delete_booking":
          await FSService.deleteBooking(action.id);
          break;
        case "add_court":
          await FSService.addCourt(action.court);
          break;
        case "update_court":
          await FSService.updateCourt(action.court);
          break;
        case "delete_court":
          await FSService.deleteCourt(action.courtId);
          break;
        case "reorder_courts":
          await FSService.reorderCourts(action.courts);
          break;
        case "create_customer":
          await FSService.createCustomer(action.customer);
          break;
        case "update_customer":
          await FSService.updateCustomer(action.customer);
          break;
        case "update_customer_notes":
          await FSService.updateCustomerNotes(action.customerId, action.notes);
          break;
        case "create_payment":
          await FSService.createPayment(action.payment);
          break;
        case "verify_payment":
          await FSService.verifyPayment(action.paymentId);
          break;
        case "reject_payment":
          await FSService.rejectPayment(action.paymentId);
          break;
        case "create_maintenance_slot":
          await FSService.createMaintenanceSlot(action.slot);
          break;
        case "delete_maintenance_slot":
          await FSService.deleteMaintenanceSlot(action.slotId);
          break;
        case "hydrate":
          // Handled directly by reducer — no Firestore write needed
          rawDispatch(action);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`❌ Firestore write failed for ${action.type}:`, err);
      if (err instanceof Error) {
        console.error("   →", err.message);
      }
    }
  }, []);

  // Derive revenueHistory from bookings
  const revenueHistory = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of state.bookings) {
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
  }, [state.bookings]);

  const value = useMemo(
    () => ({
      state: { ...state, revenueHistory },
      dispatch,
      loading: loaded < COLLECTIONS.length * 2,
    }),
    [state, revenueHistory, dispatch, loaded],
  );

  return <ClubCtx.Provider value={value}>{children}</ClubCtx.Provider>;
};

export const useClub = () => {
  const ctx = useContext(ClubCtx);
  if (!ctx) throw new Error("useClub must be used within ClubProvider");
  return ctx;
};