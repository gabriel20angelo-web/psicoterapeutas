"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import BackgroundEffects from "@/components/BackgroundEffects";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/");
  }, [user, authLoading, router]);

  // Always show login form — don't block on auth loading
  if (!authLoading && user) return null;

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message === "Invalid login credentials" ? "Email ou senha incorretos." : err.message);
      setSubmitting(false);
    } else {
      router.replace("/");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] relative flex items-center justify-center px-4">
      <BackgroundEffects />
      <div className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-8">
          <h1 className="font-fraunces font-bold text-3xl text-[var(--text-primary)]">
            Allos <span className="text-[var(--orange-500)]">Terapeutas</span>
          </h1>
          <p className="font-dm text-sm text-[var(--text-tertiary)] mt-2">Painel do Terapeuta</p>
        </div>

        <div className="card-base p-6">
          <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-6">Entrar</h2>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-dm font-medium text-sm transition-all duration-200 bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--orange-500)]/30 hover:bg-[var(--bg-hover)]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Entrar com Google
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border-default)]" />
            <span className="text-xs text-[var(--text-tertiary)] font-dm">ou</span>
            <div className="flex-1 h-px bg-[var(--border-default)]" />
          </div>

          {/* Email/Password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-dm text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] font-dm text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange-500)]/40 focus:border-[var(--orange-500)] transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="font-dm text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] font-dm text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange-500)]/40 focus:border-[var(--orange-500)] transition-all"
                  placeholder="Sua senha"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="font-dm text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--orange-500)] text-white font-dm text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} /> Entrar</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-dm text-sm text-[var(--text-tertiary)]">
              Ainda nao tem conta?{" "}
              <Link href="/signup" className="text-[var(--orange-500)] hover:underline font-medium">Criar conta</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
