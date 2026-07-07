import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Settings = {
  openingTime: string;
  closingTime: string;
  slotMinutes: 30 | 60 | 90;
  currency: "PKR";
  theme: "light" | "dark";
  clubName: string;
  residentRate: number;
  outsiderRate: number;
};

const DEFAULTS: Settings = {
  openingTime: "07:00",
  closingTime: "23:00",
  slotMinutes: 60,
  currency: "PKR",
  theme: "light",
  clubName: "Baseline Padel — Lahore",
  residentRate: 500,
  outsiderRate: 1000,
};

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const SettingsCtx = createContext<Ctx | null>(null);
const KEY = "baseline.settings";

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  const update = (patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return <SettingsCtx.Provider value={{ settings, update }}>{children}</SettingsCtx.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
