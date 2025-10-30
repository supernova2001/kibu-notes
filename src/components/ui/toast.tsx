"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ToastVariant = "default" | "success" | "error";

export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextType = {
  toast: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <Toaster />");
  return ctx;
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = {
      id,
      variant: "default",
      durationMs: 3500,
      ...t,
    };
    setItems((prev) => [...prev, item]);
    const ttl = item.durationMs ?? 3500;
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, ttl);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* portal-like fixed container */}
      <div className="fixed inset-x-0 top-3 z-[100] flex justify-center pointer-events-none">
        <div className="w-full max-w-md space-y-2 px-3">
          {items.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-md border px-3 py-2 shadow-sm text-sm bg-white ${
                t.variant === "success"
                  ? "border-green-300"
                  : t.variant === "error"
                  ? "border-red-300"
                  : "border-gray-200"
              }`}
            >
              {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
              {t.description && <div className="text-gray-700">{t.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}


