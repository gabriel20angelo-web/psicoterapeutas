"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

declare global {
  interface Window {
    __SPA_REDIRECT?: string;
  }
}

export default function SpaRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const target = window.__SPA_REDIRECT;
    if (target) {
      window.__SPA_REDIRECT = undefined;
      // Strip basePath for Next.js router
      const nextPath = target.replace("/psicoterapeutas", "") || "/";
      if (nextPath !== pathname) {
        router.replace(nextPath);
      }
    }
  }, [router, pathname]);

  return null;
}
