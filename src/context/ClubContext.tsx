import { createContext, useContext, useMemo, useReducer, useEffect, type ReactNode } from "react";
import {
  buildSeed,
  type Booking,
  type Court,
  type Customer,
  type Payment,
  type Activity,
  type MaintenanceSlot,
} from "@/data/seed";
import type { BookingStatus } from "@/lib/status";

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
  | { type: "reorder_courts"; courts: Court[] };

const pushActivity = (state: State, msg: string, kind: Activity["kind"]): Activity[] =>
  [
    {
      id: `A-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      message: msg,
      at: new Date().toISOString(),
    },
    ...state.activity,
  ].slice(0, 60);

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "set_booking_status": {
      const bookings = state.bookings.map((b) =>
        b.id === action.id ? { ...b, status: action.status } : b,
      );
      const b = bookings.find((x) => x.id === action.id);
      const cust = state.customers.find((c) => c.id === b?.customerId);
      const label = action.status.replace("_", " ");
      return {
        ...state,
        bookings,
        activity: pushActivity(
          state,
          `${cust?.name ?? "Booking"} → ${label} (${action.id})`,
          action.status === "cancelled"
            ? "cancel"
            : action.status === "checked_in"
              ? "checkin"
              : "booking",
        ),
      };
    }
    case "verify_payment": {
      const payments = state.payments.map((p) =>
        p.id === action.paymentId ? { ...p, status: "verified" as const } : p,
      );
      const p = payments.find((x) => x.id === action.paymentId);
      const bookings = state.bookings.map((b) =>
        b.id === p?.bookingId ? { ...b, status: "booked" as BookingStatus } : b,
      );
      return {
        ...state,
        payments,
        bookings,
        activity: pushActivity(state, `Payment ${action.paymentId} verified`, "payment"),
      };
    }
    case "reject_payment": {
      const payments = state.payments.map((p) =>
        p.id === action.paymentId ? { ...p, status: "rejected" as const } : p,
      );
      const p = payments.find((x) => x.id === action.paymentId);
      const bookings = state.bookings.map((b) =>
        b.id === p?.bookingId ? { ...b, status: "reserved" as BookingStatus } : b,
      );
      return {
        ...state,
        payments,
        bookings,
        activity: pushActivity(state, `Payment ${action.paymentId} rejected`, "payment"),
      };
    }
    case "create_booking": {
      return {
        ...state,
        bookings: [action.booking, ...state.bookings],
        activity: pushActivity(state, `New reservation ${action.booking.id}`, "booking"),
      };
    }
    case "update_booking": {
      return {
        ...state,
        bookings: state.bookings.map((b) => (b.id === action.booking.id ? action.booking : b)),
      };
    }
    case "toggle_court_maintenance": {
      return {
        ...state,
        courts: state.courts.map((c) =>
          c.id === action.courtId
            ? { ...c, status: c.status === "active" ? "maintenance" : "active" }
            : c,
        ),
      };
    }
    case "add_court": {
      return {
        ...state,
        courts: [...state.courts, action.court],
        activity: pushActivity(state, `New court ${action.court.name} added`, "maintenance"),
      };
    }
    case "update_court": {
      return {
        ...state,
        courts: state.courts.map((c) => (c.id === action.court.id ? action.court : c)),
        activity: pushActivity(state, `Court ${action.court.name} updated`, "maintenance"),
      };
    }
    case "delete_court": {
      return {
        ...state,
        courts: state.courts.filter((c) => c.id !== action.courtId),
        activity: pushActivity(state, `Court deleted`, "maintenance"),
      };
    }
    case "reorder_courts": {
      return {
        ...state,
        courts: action.courts,
      };
    }
    case "update_customer_notes": {
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.customerId ? { ...c, notes: action.notes } : c,
        ),
      };
    }
    case "update_customer": {
      return {
        ...state,
        customers: state.customers.map((c) => (c.id === action.customer.id ? action.customer : c)),
        activity: pushActivity(state, `Customer ${action.customer.name} updated`, "customer"),
      };
    }
    case "create_customer": {
      return {
        ...state,
        customers: [action.customer, ...state.customers],
        activity: pushActivity(state, `New customer ${action.customer.name} added`, "customer"),
      };
    }
    case "create_maintenance_slot": {
      return {
        ...state,
        maintenanceSlots: [action.slot, ...state.maintenanceSlots],
        activity: pushActivity(
          state,
          `Maintenance scheduled for court ${action.slot.courtId}`,
          "maintenance",
        ),
      };
    }
    case "delete_maintenance_slot": {
      return {
        ...state,
        maintenanceSlots: state.maintenanceSlots.filter((s) => s.id !== action.slotId),
      };
    }
    case "delete_booking": {
      return {
        ...state,
        bookings: state.bookings.filter((b) => b.id !== action.id),
      };
    }
    case "create_payment": {
      return {
        ...state,
        payments: [action.payment, ...state.payments],
      };
    }
  }
};

type Ctx = { state: State; dispatch: React.Dispatch<Action> };
const ClubCtx = createContext<Ctx | null>(null);

const LOCAL_STORAGE_KEY = "padelivo_club_state";

const init = () => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored state, falling back to seed");
    }
  }
  return buildSeed();
};

export const ClubProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ClubCtx.Provider value={value}>{children}</ClubCtx.Provider>;
};

export const useClub = () => {
  const ctx = useContext(ClubCtx);
  if (!ctx) throw new Error("useClub must be used within ClubProvider");
  return ctx;
};
