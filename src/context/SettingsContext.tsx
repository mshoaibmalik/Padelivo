import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
const SETTINGS_DOC_ID = "default";

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    const ref = doc(db, "settings", SETTINGS_DOC_ID);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULTS, ...snap.data() } as Settings);
      } else {
        // No settings doc yet — write defaults
        setDoc(ref, DEFAULTS);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  const update = (patch: Partial<Settings>) => {
    const ref = doc(db, "settings", SETTINGS_DOC_ID);
    setDoc(ref, patch, { merge: true });
    // Optimistic local update — onSnapshot will reconcile
    setSettings((s) => ({ ...s, ...patch }));
  };

  return <SettingsCtx.Provider value={{ settings, update }}>{children}</SettingsCtx.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};