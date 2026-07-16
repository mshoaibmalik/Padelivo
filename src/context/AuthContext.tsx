import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export type Manager = { name: string; email: string; role: "Manager" };

type Ctx = {
  manager: Manager | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

function toManager(user: User): Manager {
  const nameFromEmail = user.email
    ? user.email
        .split("@")[0]
        .replace(/\./g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Club Manager";
  return { name: nameFromEmail, email: user.email ?? "", role: "Manager" };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [manager, setManager] = useState<Manager | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setManager(toManager(user));
      } else {
        setManager(null);
      }
      setReady(true);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setManager(toManager(cred.user));
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setManager(null);
  };

  if (!ready) {
    return null; // prevent flash of login page while checking auth state
  }

  return <AuthCtx.Provider value={{ manager, signIn, signOut }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};