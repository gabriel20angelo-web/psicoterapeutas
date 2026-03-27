"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ToastContainer } from "@/components/ui/Toast";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
}

interface ToastContextType {
  toast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, options?: ToastOptions) => {
    const id = `toast-${++toastCounter}`;
    const item: ToastItem = {
      id,
      message,
      type: options?.type ?? "info",
      duration: options?.duration ?? 4000,
      action: options?.action,
    };
    setToasts((prev) => [...prev, item]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
