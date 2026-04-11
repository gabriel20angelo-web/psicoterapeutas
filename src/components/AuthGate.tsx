"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, LogIn } from "lucide-react";

const AUTH_KEY = "meu-consultorio-auth";
const SETUP_KEY = "meu-consultorio-setup";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "__meu_consultorio_salt__");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_KEY);
    const setup = localStorage.getItem(SETUP_KEY);
    if (token && setup) {
      setAuthenticated(true);
    } else if (!setup) {
      setNeedsSetup(true);
      setAuthenticated(false);
    } else {
      setAuthenticated(false);
    }
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 4) {
      setError("Senha deve ter pelo menos 4 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const hash = await hashPassword(password);
    localStorage.setItem(SETUP_KEY, hash);
    localStorage.setItem(AUTH_KEY, "true");
    setAuthenticated(true);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const hash = await hashPassword(password);
    const stored = localStorage.getItem(SETUP_KEY);
    if (hash === stored) {
      localStorage.setItem(AUTH_KEY, "true");
      setAuthenticated(true);
    } else {
      setError("Senha incorreta");
    }
    setLoading(false);
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deepest)" }}>
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-deepest)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--bg-surface-orange)" }}
            >
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <h1
              className="text-xl font-bold font-fraunces"
              style={{ color: "var(--text-primary)" }}
            >
              Meu Consultório
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {needsSetup
                ? "Crie uma senha para proteger seus dados"
                : "Digite sua senha para acessar"}
            </p>
          </div>

          <form onSubmit={needsSetup ? handleSetup : handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {needsSetup && (
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Confirmar senha
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #C84B31, #DA6C34)" }}
            >
              <LogIn size={16} />
              {loading ? "Aguarde..." : needsSetup ? "Criar senha e entrar" : "Entrar"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          Dados protegidos localmente
        </p>
      </motion.div>
    </div>
  );
}
