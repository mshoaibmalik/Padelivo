import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardHeader } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { HOURS_OF_DAY } from "@/data/seed";
import { PKR, fmtTime } from "@/lib/format";
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

const TABS = ["Club", "Hours & slots", "Pricing", "Appearance"] as const;

function SettingsPage() {
  const { settings, update } = useSettings();
  const { state } = useClub();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Club");

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="How the club is configured"
        description="Hours, pricing and appearance — reflected everywhere in the app."
      />

      <div className="mt-6 flex flex-wrap gap-1 border-b border-line-soft">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t
                ? "border-clay text-ink"
                : "border-transparent text-ink-mute hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-3xl">
        {tab === "Club" && (
          <Card>
            <CardHeader title="Identity" subtitle="Shown in the sidebar and on receipts" />
            <div className="space-y-4 p-5">
              <Field label="Club name">
                <input
                  value={settings.clubName}
                  onChange={(e) => update({ clubName: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </Field>
              <Field label="Currency">
                <div className="text-sm text-ink">Pakistani Rupee (PKR)</div>
              </Field>
            </div>
          </Card>
        )}

        {tab === "Hours & slots" && (
          <Card>
            <CardHeader title="Business hours" subtitle="Applied across the calendar" />
            <div className="grid grid-cols-2 gap-4 p-5">
              <Field label="Opens">
                <select
                  value={settings.openingTime}
                  onChange={(e) => update({ openingTime: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink"
                >
                  {HOURS_OF_DAY.map((h) => (
                    <option key={h} value={h}>
                      {fmtTime(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Closes">
                <select
                  value={settings.closingTime}
                  onChange={(e) => update({ closingTime: e.target.value })}
                  className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink"
                >
                  {HOURS_OF_DAY.map((h) => (
                    <option key={h} value={h}>
                      {fmtTime(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Slot duration">
                <div className="flex items-center gap-2">
                  {([30, 60, 90] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => update({ slotMinutes: m })}
                      className={cn(
                        "h-9 rounded-md border px-3 text-sm",
                        settings.slotMinutes === m
                          ? "border-clay bg-clay-soft text-clay"
                          : "border-line bg-card text-ink hover:bg-secondary"
                      )}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Card>
        )}

        {tab === "Pricing" && (
          <Card>
            <CardHeader title="Court pricing" subtitle="Per hour" />
            <div className="divide-y divide-line-soft">
              {state.courts.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm text-ink">{c.name}</div>
                    <div className="text-[11px] text-ink-mute">{c.surface}</div>
                  </div>
                  <div className="font-mono text-sm text-ink">{PKR(c.hourlyRate)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "Appearance" && (
          <Card>
            <CardHeader title="Theme" subtitle="Choose light or dark" />
            <div className="flex gap-3 p-5">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ theme: t })}
                  className={cn(
                    "flex-1 overflow-hidden rounded-lg border transition-colors",
                    settings.theme === t ? "border-clay ring-2 ring-clay/30" : "border-line hover:border-line"
                  )}
                >
                  <div
                    className="h-24"
                    style={{
                      background: t === "light" ? "oklch(0.983 0.005 85)" : "oklch(0.16 0.008 60)",
                    }}
                  >
                    <div className="flex h-full items-end p-3">
                      <div className="h-2 w-16 rounded-full" style={{ background: t === "light" ? "oklch(0.9 0.008 70)" : "oklch(0.28 0.008 60)" }} />
                    </div>
                  </div>
                  <div className="border-t border-line-soft bg-card px-3 py-2 text-left text-sm text-ink">
                    {t === "light" ? "Light" : "Dark"}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="primary">Save changes</Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
        {label}
      </div>
      {children}
    </label>
  );
}