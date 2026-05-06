import { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * 按钮 4 variant：
 * - primary：主 CTA，反相高对比（白底黑字 / 黑底白字）
 * - outline：次级，透明 + 强边
 * - ghost：辅助，无边框，仅 hover 显容器
 * - danger：破坏性动作（删除 / 卖出确认）—— 用 neg 语义色，不滥用
 *
 * 颜色不承担警告语义，故没有 "warning" variant；
 * 想强调"小心"用 chip-warn 或文案，按钮变色不直觉。
 */
type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap " +
  "transition-colors duration-100 " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] " +
    "hover:bg-[var(--accent-hover)] font-medium",
  outline:
    "bg-transparent text-[var(--text-primary)] " +
    "border border-[var(--border-strong)] " +
    "hover:bg-[var(--surface-overlay)] hover:border-[var(--text-primary)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] " +
    "hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]",
  danger:
    "bg-transparent text-[var(--neg)] " +
    "border border-[var(--neg)] " +
    "hover:bg-[var(--neg)] hover:text-[var(--surface-base)] font-medium",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
