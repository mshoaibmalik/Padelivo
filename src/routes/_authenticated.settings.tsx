import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardHeader } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { HOURS } from "@/data/seed";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Baseline" },
      { name: "description", content: "Configure hours, pricing and appearance." },
    ],
  }),
  component: SettingsPage,
});

const TABS = ["Club Identity", "Hours & Slots", "Pricing Rules", "Appearance"] as const;

function SettingsPage() {
  const { settings, update } = useSettings();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Club Identity");
  const [businessAddress, setBusinessAddress] = useState("Phase 5, DHA, Lahore, Pakistan");
  const [businessPhone, setBusinessPhone] = useState("+92 42 111 222 333");

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Club Configuration"
        description="Configure schedules, hourly pricing rates, and application appearance."
      />

      <div className="mt-6 flex flex-wrap gap-1 border-b border-line-soft">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "border-clay text-ink"
                : "border-transparent text-ink-mute hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-3xl">
        {/* TAB 1: Club Identity & Business info */}
        {tab === "Club Identity" && (
          <Card>
            <CardHeader
              title="Club Identity"
              subtitle="Identity settings displayed in portal and headers"
            />
            <div className="space-y-4 p-5">
              <Field label="Club Name">
                <input
                  value={settings.clubName}
                  onChange={(e) => update({ clubName: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Business Contact Phone">
                  <input
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                  />
                </Field>

                <Field label="Currency">
                  <div className="h-9 flex items-center text-sm font-semibold text-ink pl-1">
                    Pakistani Rupee (PKR)
                  </div>
                </Field>
              </div>

              <Field label="Facility Address">
                <textarea
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="h-16 w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink focus:border-clay focus:outline-none resize-none"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* TAB 2: Hours & Slots */}
        {tab === "Hours & Slots" && (
          <Card>
            <CardHeader
              title="Business hours"
              subtitle="Configure operational boundaries for the scheduler grid"
            />
            <div className="grid grid-cols-2 gap-4 p-5">
              <Field label="Opening Time">
                <select
                  value={settings.openingTime}
                  onChange={(e) => update({ openingTime: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {fmtTime(h)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Closing Time">
                <select
                  value={settings.closingTime}
                  onChange={(e) => update({ closingTime: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {fmtTime(h)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Duration Increments">
                <div className="flex items-center gap-2">
                  {([30, 60] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => update({ slotMinutes: m as any })}
                      className={cn(
                        "h-9 rounded-md border px-4 text-xs font-semibold transition-colors",
                        settings.slotMinutes === m
                          ? "border-clay bg-clay-soft text-clay"
                          : "border-line bg-card text-ink hover:bg-secondary",
                      )}
                    >
                      {m} min slots
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Card>
        )}

        {/* TAB 3: Pricing Rules */}
        {tab === "Pricing Rules" && (
          <Card>
            <CardHeader
              title="Hourly Rates"
              subtitle="Pricing rules calculated per person per hour"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              <Field label="Resident Hourly Rate (PKR)">
                <input
                  type="number"
                  min={0}
                  value={settings.residentRate}
                  onChange={(e) => update({ residentRate: Number(e.target.value) || 0 })}
                  className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none font-mono"
                />
              </Field>

              <Field label="Outsider Hourly Rate (PKR)">
                <input
                  type="number"
                  min={0}
                  value={settings.outsiderRate}
                  onChange={(e) => update({ outsiderRate: Number(e.target.value) || 0 })}
                  className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none font-mono"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* TAB 4: Appearance */}
        {tab === "Appearance" && (
          <Card>
            <CardHeader title="System Theme" subtitle="Configure manager visual settings" />
            <div className="flex gap-3 p-5">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ theme: t })}
                  className={cn(
                    "flex-1 overflow-hidden rounded-lg border transition-colors",
                    settings.theme === t
                      ? "border-clay ring-2 ring-clay/30"
                      : "border-line hover:border-line",
                  )}
                >
                  <div
                    className="h-24"
                    style={{
                      background: t === "light" ? "oklch(0.983 0.005 85)" : "oklch(0.16 0.008 60)",
                    }}
                  >
                    <div className="flex h-full items-end p-3">
                      <div
                        className="h-2 w-16 rounded-full"
                        style={{
                          background:
                            t === "light" ? "oklch(0.9 0.008 70)" : "oklch(0.28 0.008 60)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="border-t border-line-soft bg-card px-3 py-2 text-left text-sm text-ink">
                    {t === "light" ? "Light Mode" : "Dark Mode"}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="clay">Save settings</Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
        {label}
      </div>
      {children}
    </label>
  );
}
