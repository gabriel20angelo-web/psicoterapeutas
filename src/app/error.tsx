"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h2 className="font-fraunces font-bold text-xl text-[var(--text-primary)] mb-3">Algo deu errado</h2>
        <p className="font-dm text-sm text-[var(--text-secondary)] mb-6">
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-[var(--orange-500)] text-white font-dm text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
