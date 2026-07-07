import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone, Mail, UserCheck, Plus, X, Pencil, DollarSign } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { SearchInput } from "@/components/app/SearchInput";
import { Button } from "@/components/app/Button";
import { Card } from "@/components/app/Card";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { PKR, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type CustomerType } from "@/data/seed";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Baseline" },
      { name: "description", content: "Members, regulars and VIPs at a glance." },
    ],
  }),
  component: CustomersPage,
});

const TIERS = ["All", "Resident", "Outsider"] as const;

function CustomersPage() {
  const { state, dispatch } = useClub();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    customerType: "Resident" as CustomerType,
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    customerType: "Resident" as CustomerType,
    notes: "",
  });

  const filtered = useMemo(() => {
    return state.customers
      .filter((c) => (tier === "All" ? true : c.customerType === tier))
      .filter((c) => {
        if (!q) return true;
        const s = `${c.name} ${c.phone} ${c.email}`.toLowerCase();
        return s.includes(q.toLowerCase());
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [state.customers, q, tier]);

  const open = openId ? state.customers.find((c) => c.id === openId) : null;
  const openBookings = open
    ? state.bookings.filter((b) => b.customerId === open.id && b.status !== "cancelled").slice(0, 8)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Customer Management"
        title="Who Plays at Baseline"
        description={`${state.customers.length} registered customers. Filter by Resident or Outsider status.`}
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search name or WhatsApp..." />
            <Button variant="clay" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-1 rounded-md border border-line-soft bg-card p-1 max-w-xs">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={cn(
              "rounded px-3 py-1 text-xs font-semibold transition-colors flex-1 text-center",
              tier === t
                ? "bg-ink text-primary-foreground"
                : "text-ink-mute hover:bg-secondary hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {showAddForm && (
        <div className="mt-6 rounded-lg border border-line-soft bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">Add New Customer</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewCustomer({
                  name: "",
                  phone: "",
                  email: "",
                  customerType: "Resident",
                  notes: "",
                });
              }}
              className="text-ink-mute hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Customer Name *
              </label>
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Usman Malik"
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                WhatsApp Phone *
              </label>
              <input
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="+92 3XX XXXXXXX"
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Email Address
              </label>
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="customer@mail.pk"
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Customer Category
              </label>
              <select
                value={newCustomer.customerType}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, customerType: e.target.value as CustomerType })
                }
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                <option value="Resident">Resident</option>
                <option value="Outsider">Outsider</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Notes
              </label>
              <textarea
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                placeholder="Preferences, booking context..."
                className="h-16 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink focus:border-clay focus:outline-none resize-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewCustomer({
                  name: "",
                  phone: "",
                  email: "",
                  customerType: "Resident",
                  notes: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="clay"
              onClick={() => {
                if (!newCustomer.name || !newCustomer.phone) return;

                const customer = {
                  id: `U-${Date.now()}`,
                  name: newCustomer.name,
                  phone: newCustomer.phone,
                  email:
                    newCustomer.email ||
                    `${newCustomer.name.toLowerCase().replace(/\s/g, ".")}@mail.pk`,
                  customerType: newCustomer.customerType,
                  totalBookings: 0,
                  totalSpend: 0,
                  notes: newCustomer.notes || undefined,
                  joinedISO: new Date().toISOString(),
                };

                dispatch({ type: "create_customer", customer });
                setNewCustomer({
                  name: "",
                  phone: "",
                  email: "",
                  customerType: "Resident",
                  notes: "",
                });
                setShowAddForm(false);
              }}
              disabled={!newCustomer.name || !newCustomer.phone}
            >
              Add Customer
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !showAddForm ? (
        <div className="mt-6">
          <EmptyState title="No customers found matching filters" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer p-5 hover:border-clay/40 transition-colors shadow-xs group"
              onClick={() => setOpenId(c.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={c.name} size={40} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-base text-ink font-semibold group-hover:text-clay transition-colors">
                        {c.name}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-mute flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span className="font-mono">{c.phone}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    c.customerType === "Resident"
                      ? "bg-status-available text-status-available-fg"
                      : "bg-status-payment text-status-payment-fg",
                  )}
                >
                  {c.customerType}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-4 text-sm">
                <div>
                  <div className="font-display text-lg text-ink font-bold tabular">
                    {c.totalBookings}
                  </div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-mute">
                    Bookings
                  </div>
                </div>
                <div>
                  <div className="font-mono text-sm text-ink font-bold">
                    Rs {c.totalSpend.toLocaleString("en-PK")}
                  </div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-mute">
                    Lifetime Spend
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Customer Details Modal */}
      {open && !editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl border border-line-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line-soft p-6 bg-canvas/30">
              <div className="flex items-start gap-4">
                <Avatar name={open.name} size={56} />
                <div className="flex-1">
                  <div className="font-display text-2xl tracking-tight text-ink font-semibold">
                    {open.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute font-mono">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {open.phone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {open.email}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-mute mt-1.5 uppercase font-semibold tracking-wider">
                    Member since {fmtDate(open.joinedISO)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingId(open.id);
                  setEditForm({
                    name: open.name,
                    phone: open.phone,
                    email: open.email,
                    customerType: open.customerType,
                    notes: open.notes || "",
                  });
                }}
                className="rounded-md border border-line p-2 text-ink-mute hover:bg-secondary hover:text-ink transition-colors"
                title="Edit customer details"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-line-soft px-6 py-4 text-center bg-canvas/10">
              <div>
                <div className="font-display text-2xl text-ink font-bold tabular">
                  {open.totalBookings}
                </div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-mute">
                  Bookings count
                </div>
              </div>
              <div>
                <div className="font-mono text-base text-ink font-bold">
                  Rs {open.totalSpend.toLocaleString("en-PK")}
                </div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-mute">
                  Lifetime spend
                </div>
              </div>
              <div>
                <div className="font-display text-2xl text-clay font-bold">{open.customerType}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-mute">
                  Player Category
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                Recent Bookings log (Main Court)
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto divide-y divide-line-soft">
                {openBookings.length === 0 ? (
                  <div className="text-sm text-ink-mute py-2">No bookings logged yet.</div>
                ) : (
                  openBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="font-mono font-semibold text-ink-mute">{b.id}</span>
                      <span className="text-ink-soft">
                        {fmtDate(b.date)} ({b.startTime})
                      </span>
                      <span className="text-ink font-medium">
                        {b.durationHours} hrs · {b.totalPlayers} players
                      </span>
                      <span className="font-mono font-bold text-clay">
                        Rs {b.amount.toLocaleString("en-PK")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-line-soft px-6 py-4 bg-canvas/30">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                Operational Notes
              </div>
              <textarea
                defaultValue={open.notes ?? ""}
                onBlur={(e) =>
                  dispatch({
                    type: "update_customer_notes",
                    customerId: open.id,
                    notes: e.target.value,
                  })
                }
                placeholder="Add customer preferences, slot requirements, etc."
                className="min-h-16 w-full resize-none rounded-md border border-line bg-card px-3 py-2 text-xs text-ink focus:border-clay focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Details Modal */}
      {editingId && open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={() => setEditingId(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl border border-line-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line-soft p-6 bg-canvas/30">
              <h3 className="font-display text-xl text-ink font-semibold">
                Modify Customer Details
              </h3>
              <button onClick={() => setEditingId(null)} className="text-ink-mute hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                  WhatsApp Phone *
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                  Customer Category
                </label>
                <select
                  value={editForm.customerType}
                  onChange={(e) =>
                    setEditForm({ ...editForm, customerType: e.target.value as CustomerType })
                  }
                  className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
                >
                  <option value="Resident">Resident</option>
                  <option value="Outsider">Outsider</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line-soft">
                <Button variant="secondary" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="clay"
                  onClick={() => {
                    if (!editForm.name || !editForm.phone) return;

                    const updatedCustomer = {
                      ...open,
                      name: editForm.name,
                      phone: editForm.phone,
                      email: editForm.email,
                      customerType: editForm.customerType,
                    };

                    dispatch({ type: "update_customer", customer: updatedCustomer });
                    setEditingId(null);
                  }}
                  disabled={!editForm.name || !editForm.phone}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
