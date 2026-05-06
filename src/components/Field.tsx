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
      <span className="text-xs text-[var(--text-tertiary)] mb-1.5 block uppercase tracking-wide">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs text-[var(--text-tertiary)] mt-1.5 block">
          {hint}
        </span>
      )}
    </label>
  );
}

/**
 * 输入框：底部强边为主，focus 时变白色加粗
 * 数字 input 自动 tabular-nums + mono 字体
 */
export const inputClass =
  "w-full bg-[var(--surface-base)] " +
  "border border-[var(--border-strong)] " +
  "px-3 py-2 text-sm tabular-nums font-mono " +
  "text-[var(--text-primary)] " +
  "placeholder:text-[var(--text-tertiary)] " +
  "focus:border-[var(--accent)] focus:outline-none " +
  "transition-colors duration-100";

export const selectClass =
  "w-full bg-[var(--surface-base)] " +
  "border border-[var(--border-strong)] " +
  "px-3 py-2 text-sm " +
  "text-[var(--text-primary)] " +
  "focus:border-[var(--accent)] focus:outline-none " +
  "transition-colors duration-100";
