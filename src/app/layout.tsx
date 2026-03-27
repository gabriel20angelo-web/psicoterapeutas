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
  title: "Allos Terapeutas — Painel do Terapeuta",
  description: "Ferramenta de gestão clínica para terapeutas da Associação Allos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon-allos.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-allos.png" />
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('allos-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
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
