import { ReactNode } from "react";

/** 表单字段：label + input/select/... 容器，统一样式 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-400 mb-1 block">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500 mt-1 block">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full bg-zinc-950 border border-zinc-700 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 rounded px-3 py-2 text-sm tabular-nums outline-none transition";

export const selectClass =
  "w-full bg-zinc-950 border border-zinc-700 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 rounded px-3 py-2 text-sm outline-none transition";
