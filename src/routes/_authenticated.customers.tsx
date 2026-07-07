import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone, Mail, Star, Plus, X, Pencil } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { SearchInput } from "@/components/app/SearchInput";
import { Button } from "@/components/app/Button";
import { Card } from "@/components/app/Card";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { PKR, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type Membership } from "@/data/seed";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Baseline" },
      { name: "description", content: "Members, regulars and VIPs at a glance." },
    ],
  }),
  component: CustomersPage,
});

const TIERS = ["All", "VIP", "Regular"] as const;

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
    membership: "Regular" as Membership,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    membership: "Regular" as Membership,
  });

  const filtered = useMemo(() => {
    return state.customers
      .filter((c) => (tier === "All" ? true : c.membership === tier))
      .filter((c) => {
        if (!q) return true;
        const s = `${c.name} ${c.phone} ${c.email}`.toLowerCase();
        return s.includes(q.toLowerCase());
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [state.customers, q, tier]);

  const open = openId ? state.customers.find((c) => c.id === openId) : null;
  const openBookings = open
    ? state.bookings.filter((b) => b.customerId === open.id).slice(0, 8)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="Who plays at Baseline"
        description={`${state.customers.length} members — VIPs, regulars and new sign-ups.`}
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search name or phone…" />
            <Button variant="clay" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-1 rounded-md border border-line-soft bg-card p-1">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium",
              tier === t
                ? "bg-ink text-primary-foreground"
                : "text-ink-mute hover:bg-secondary hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {showAddForm && (
        <div className="mt-6 rounded-lg border border-line-soft bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-ink">Add New Customer</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewCustomer({ name: "", phone: "", email: "", membership: "Regular" });
              }}
              className="text-ink-mute hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Customer Name *
              </label>
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Enter customer name"
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Phone Number *
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
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Email Address *
              </label>
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="customer@example.com"
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Membership Type
              </label>
              <select
                value={newCustomer.membership}
                onChange={(e) => setNewCustomer({ ...newCustomer, membership: e.target.value as Membership })}
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                <option value="VIP">VIP</option>
                <option value="Regular">Regular</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewCustomer({ name: "", phone: "", email: "", membership: "Regular" });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="clay"
              onClick={() => {
                if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) return;
                
                const customer = {
                  id: `U-${Date.now()}`,
                  name: newCustomer.name,
                  phone: newCustomer.phone,
                  email: newCustomer.email,
                  membership: newCustomer.membership,
                  totalBookings: 0,
                  totalSpend: 0,
                  joinedISO: new Date().toISOString(),
                };
                
                dispatch({ type: "create_customer", customer });
                setNewCustomer({ name: "", phone: "", email: "", membership: "Regular" });
                setShowAddForm(false);
              }}
              disabled={!newCustomer.name || !newCustomer.phone || !newCustomer.email}
            >
              Add Customer
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !showAddForm ? (
        <div className="mt-6">
          <EmptyState title="No customers found" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer p-5 transition-colors hover:border-line"
              onClick={() => setOpenId(c.id)}
            >
              <div className="flex items-start gap-3">
                <Avatar name={c.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-base text-ink">{c.name}</span>
                    {c.membership === "VIP" && (
                      <Star className="h-3.5 w-3.5 fill-clay text-clay" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-ink-mute">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    c.membership === "VIP"
                      ? "bg-clay-soft text-clay"
                      : c.membership === "Regular"
                        ? "bg-status-completed text-status-completed-fg"
                        : "bg-status-payment text-status-payment-fg"
                  )}
                >
                  {c.membership}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-4 text-sm">
                <div>
                  <div className="font-display text-xl text-ink tabular">{c.totalBookings}</div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-ink-mute">Bookings</div>
                </div>
                <div>
                  <div className="font-mono text-base text-ink">{PKR(c.totalSpend)}</div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-ink-mute">Lifetime</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && !editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line-soft p-6">
              <div className="flex items-start gap-4">
                <Avatar name={open.name} size={56} />
                <div className="flex-1">
                  <div className="font-display text-2xl tracking-tight text-ink">{open.name}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-mute">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {open.phone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {open.email}
                    </span>
                    <span>Joined {fmtDate(open.joinedISO)}</span>
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
                    membership: open.membership,
                  });
                }}
                className="rounded p-2 text-ink-mute hover:bg-secondary hover:text-ink"
                title="Edit customer"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-line-soft px-6 py-4 text-center">
              <div>
                <div className="font-display text-2xl text-ink tabular">{open.totalBookings}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-ink-mute">Bookings</div>
              </div>
              <div>
                <div className="font-mono text-lg text-ink">{PKR(open.totalSpend)}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-ink-mute">Lifetime spend</div>
              </div>
              <div>
                <div className="font-display text-2xl text-ink">{open.membership}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-ink-mute">Tier</div>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Recent bookings
              </div>
              <div className="space-y-1">
                {openBookings.length === 0 ? (
                  <div className="text-sm text-ink-mute">No bookings yet.</div>
                ) : (
                  openBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      <span className="font-mono text-xs text-ink-mute">{b.id}</span>
                      <span className="text-ink-soft">{fmtDate(b.date)}</span>
                      <span className="font-mono text-ink">{PKR(b.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-line-soft px-6 py-4">
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Notes
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
                placeholder="Preferences, membership context, coach notes…"
                className="min-h-16 w-full resize-y rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {editingId && open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setEditingId(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line-soft p-6">
              <h3 className="font-display text-xl text-ink">Edit Customer</h3>
              <button
                onClick={() => setEditingId(null)}
                className="text-ink-mute hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
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
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                  Membership Type
                </label>
                <select
                  value={editForm.membership}
                  onChange={(e) => setEditForm({ ...editForm, membership: e.target.value as Membership })}
                  className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
                >
                  <option value="VIP">VIP</option>
                  <option value="Regular">Regular</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="clay"
                  onClick={() => {
                    if (!editForm.name || !editForm.phone || !editForm.email) return;
                    
                    const updatedCustomer = {
                      ...open,
                      name: editForm.name,
                      phone: editForm.phone,
                      email: editForm.email,
                      membership: editForm.membership,
                    };
                    
                    dispatch({ type: "update_customer", customer: updatedCustomer });
                    setEditingId(null);
                  }}
                  disabled={!editForm.name || !editForm.phone || !editForm.email}
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
