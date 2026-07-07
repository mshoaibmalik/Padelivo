import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Baseline" },
      { name: "description", content: "Sign in to Baseline padel club operations." },
    ],
  }),
  component: () => (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  ),
});

function LoginPage() {
  const { manager, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@baseline.pk");
  const [password, setPassword] = useState("baseline");
  const [busy, setBusy] = useState(false);

  if (manager) return <Navigate to="/dashboard" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      signIn(email);
      navigate({ to: "/dashboard" });
    }, 350);
  };

  return (
    <div className="grid min-h-screen w-full bg-canvas lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-10">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink text-primary-foreground">
              <span className="font-display text-xl leading-none">B</span>
            </div>
            <span className="font-display text-lg text-ink">Baseline</span>
          </div>
          <div className="mb-8">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-mute">
              Manager sign-in
            </div>
            <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight text-ink">
              Run the club, calmly.
            </h1>
            <p className="mt-2 text-sm text-ink-mute">
              One tab for courts, bookings, payments and reporting.
            </p>
          </div>

          <label className="mb-4 block">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
              Email
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
            />
          </label>
          <label className="mb-6 block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Password
              </span>
              <a className="text-[11px] text-ink-mute hover:text-ink" href="#">
                Forgot?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="group flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-primary-foreground transition-colors hover:bg-ink/90 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <p className="mt-6 text-center text-[11px] text-ink-mute">
            Prototype — any credentials will sign you in.
          </p>
        </motion.form>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(1200px 500px at 80% 20%, oklch(0.28 0.08 40) 0%, transparent 60%), radial-gradient(900px 500px at 20% 90%, oklch(0.22 0.03 60) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between px-14 py-16 text-white/85">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
            Baseline · Club OS
          </div>
          <div>
            <div className="font-display text-5xl leading-[1.05] tracking-tight text-white">
              Every court, every hour,
              <br />
              <span className="italic text-clay">accounted for.</span>
            </div>
            <p className="mt-6 max-w-md text-sm text-white/60">
              One court, 300+ monthly reservations, one calm interface. Reserve, verify, check-in,
              complete — without leaving the desk.
            </p>
          </div>
          <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.14em] text-white/40">
            <span>Lahore</span>
            <span className="h-px w-6 bg-white/20" />
            <span>Karachi</span>
            <span className="h-px w-6 bg-white/20" />
            <span>Islamabad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
