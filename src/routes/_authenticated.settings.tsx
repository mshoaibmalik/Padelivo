import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardHeader } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Baseline" },
      { name: "description", content: "Configure pricing and appearance." },
    ],
  }),
  component: SettingsPage,
});

const TABS = ["Pricing Rules", "Appearance"] as const;

function SettingsPage() {
  const { settings, update } = useSettings();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pricing Rules");
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
        {/* TAB 1: Pricing Rules */}
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

        {/* TAB 2: Appearance */}
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
