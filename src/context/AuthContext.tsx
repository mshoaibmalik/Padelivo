import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Manager = { name: string; email: string; role: "Manager" };

type Ctx = {
  manager: Manager | null;
  signIn: (email: string) => void;
  signOut: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);
const KEY = "baseline.manager";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [manager, setManager] = useState<Manager | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setManager(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const signIn = (email: string) => {
    const nameFromEmail = email
      .split("@")[0]
      .replace(/\./g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const m: Manager = { name: nameFromEmail || "Club Manager", email, role: "Manager" };
    localStorage.setItem(KEY, JSON.stringify(m));
    setManager(m);
  };

  const signOut = () => {
    localStorage.removeItem(KEY);
    setManager(null);
  };

  return <AuthCtx.Provider value={{ manager, signIn, signOut }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
