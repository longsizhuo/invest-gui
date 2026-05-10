import { NavLink, Outlet } from "react-router-dom";
import { usePrivacy } from "./lib/privacy";
import { useNudges } from "./lib/useNudges";

/**
 * 顶层布局：导航栏 + 路由出口
 *
 * 导航分两组：
 * - 核心日常：主面板 / 流水 / 策略 / 委员会 —— 用户高频
 * - 次级：系统 / 透视 —— 字号缩 + 灰阶降一级
 *
 * 视觉装饰：active 状态用底部 2px 实色边，不靠颜色变化
 * （颜色留给数据语义；导航是结构不是数据）
 */

const linkBase =
  "text-sm font-ui transition-colors duration-100 " +
  "border-b-2 border-transparent pb-0.5 " +
  "hover:text-[var(--text-primary)]";

const linkActive =
  "text-[var(--text-primary)] border-[var(--accent)]";

const linkInactive = "text-[var(--text-secondary)]";

const linkSecondary =
  "text-xs font-ui transition-colors duration-100 " +
  "border-b-2 border-transparent pb-0.5 " +
  "hover:text-[var(--text-primary)]";

const PRIMARY_NAV = [
  { to: "/", label: "主面板", end: true },
  { to: "/history", label: "流水" },
  { to: "/strategy", label: "策略" },
  { to: "/committee", label: "委员会" },
];

const SECONDARY_NAV = [
  { to: "/system", label: "系统" },
];

/**
 * NudgesInit：只负责初始化 useNudges hook。
 * 独立组件而非直接在 App 里调，是因为 useNudges 依赖 useToast，
 * 后者要求处于 ToastProvider 树内。App 本身由 main.tsx 的 ToastProvider 包裹，
 * 所以这里安全调用。
 */
function NudgesInit() {
  useNudges();
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-base)]">
      {/* 全局 nudge 初始化：轮询 reengagement + 首次拉 fresh insights */}
      <NudgesInit />

      <header className="border-b border-[var(--border-subtle)]">
        {/*
          移动端（375px）策略：
          - Wordmark 独占第一行
          - 导航链接 flex-wrap 换行，gap 收小到 gap-4
          - 次级导航和隐私 toggle 跟在核心导航后，不再 ml-auto（会挤掉换行项）
        */}
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-0 sm:h-14 flex flex-wrap sm:flex-nowrap items-center gap-x-6 gap-y-2">
          {/* Wordmark */}
          <NavLink
            to="/"
            end
            className="font-display text-lg tracking-display-tight text-[var(--text-primary)] shrink-0"
          >
            {import.meta.env.VITE_INSTANCE_NAME ?? "openInvest"}
          </NavLink>

          {/* 核心导航 —— flex-wrap 让移动端自然换行 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkInactive}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* 次级导航 + 隐私 toggle —— 移动端也展示，sm 以上推到右边 */}
          <div className="flex items-center gap-4 sm:ml-auto">
            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${linkSecondary} ${isActive ? linkActive : "text-[var(--text-tertiary)]"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <PrivacyToggle />
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border-subtle)] px-6 py-4 text-xs text-[var(--text-tertiary)] text-center">
        {/*
          可配置实例名 + 上游链接 —— 让 fork 用户的部署看着是"自家实例"，
          而不是"作者私人面板"。VITE_INSTANCE_NAME 在 .env 里设置。
        */}
        {import.meta.env.VITE_INSTANCE_NAME ?? "openInvest"} ·{" "}
        <a
          href={import.meta.env.VITE_GITHUB_REPO ?? "https://github.com/longsizhuo/openInvest"}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
        >
          {/* 链接文字：取 repo URL 的 path 部分作为简短 slug */}
          {(import.meta.env.VITE_GITHUB_REPO ?? "https://github.com/longsizhuo/openInvest")
            .replace(/^https?:\/\/[^/]+\//, "")}
        </a>{" "}
        · MIT
      </footer>
    </div>
  );
}

/**
 * 顶导隐私模式 toggle —— 公共场合一键脱敏所有金额
 *
 * 按钮设计意图：
 * - 用 SVG 眼睛 icon 而不是 emoji，跨平台渲染一致 + 配合设计 token
 * - 状态用 stroke 颜色和"slash 斜杠"区分（眼睛 / 闭眼 ✕）
 * - hover 浅化背景；focus ring 走全局 :focus-visible token
 */
function PrivacyToggle() {
  const { enabled, toggle } = usePrivacy();
  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "显示金额（当前：脱敏中）" : "脱敏金额（公共场合用）"}
      aria-label={enabled ? "显示金额" : "脱敏金额"}
      aria-pressed={enabled}
      className={
        "inline-flex items-center justify-center w-8 h-8 " +
        "border border-[var(--border-subtle)] " +
        "transition-colors duration-100 " +
        (enabled
          ? "bg-[var(--surface-overlay)] text-[var(--text-primary)]"
          : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]")
      }
    >
      {enabled ? (
        // 闭眼：眼睛 + 斜杠
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      ) : (
        // 睁眼
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
