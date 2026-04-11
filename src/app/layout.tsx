import type { Metadata } from "next";
import { Fraunces, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";

const fraunces = Fraunces({
  subsets: ["latin"], weight: ["300", "500", "700"],
  style: ["normal", "italic"], variable: "--font-fraunces", display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"], weight: ["400", "500", "600"],
  variable: "--font-dm", display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"], weight: ["400", "500", "600"],
  variable: "--font-mono", display: "swap",
});

export const metadata: Metadata = {
  title: "Meu Consultório — Gestão Clínica",
  description: "Ferramenta pessoal de gestão clínica para terapeutas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/psicoterapeutas/icon-allos.png" type="image/png" />
        <link rel="apple-touch-icon" href="/psicoterapeutas/icon-512.png" />
        <link rel="manifest" href="/psicoterapeutas/manifest.json" />
        <meta name="theme-color" content="#ea580c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('allos-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/psicoterapeutas/sw.js')}` }} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var r=window.location,s=r.search;if(s&&s.indexOf('//')!==-1){var q=s.slice(1).split('&'),p=q[0];if(p.indexOf('//')===0){var decoded='/psicoterapeutas/'+p.slice(2).split('~and~').join('&');history.replaceState(null,null,decoded+(q.length>1?'?'+q.slice(1).join('&').split('~and~').join('&'):'')+r.hash)}}})()` }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Ir para o conteúdo principal</a>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
