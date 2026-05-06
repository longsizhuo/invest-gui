import { ReactNode } from "react";

/**
 * 通用容器卡片
 *
 * 设计要点：
 * - 1px 实色细边，零圆角（金融工具不要"软"边）
 * - 仅 surface-raised 一层背景，不靠阴影/ring 强调
 * - title / subtitle / actions 三槽位用于 header 区
 *
 * 旧 accent="gold|blue|green" prop 已废除——颜色不承担装饰，
 * 想强调用排版或 chip 状态。
 */
export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "bg-[var(--surface-raised)] " +
        "border border-[var(--border-subtle)] " +
        "p-5 " +
        className
      }
    >
      {(title || actions) && (
        <header className="flex items-baseline justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className="space-y-2 tabular-nums">{children}</div>
    </section>
  );
}

/**
 * 卡片内 label/value 行 —— label 三级灰、value 主文等宽，右对齐
 */
export function Row({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-[var(--text-tertiary)] shrink-0">{label}</span>
      <span
        className={
          "text-sm text-[var(--text-primary)] font-mono text-right " + valueClass
        }
      >
        {value}
      </span>
    </div>
  );
}
