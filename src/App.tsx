import { NavLink, Outlet } from "react-router-dom";

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

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-base)]">
      <header className="border-b border-[var(--border-subtle)]">
        <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
          {/* Wordmark：display serif，独立于导航 */}
          <NavLink
            to="/"
            end
            className="font-display text-lg tracking-display-tight text-[var(--text-primary)] mr-2"
          >
            invest
          </NavLink>

          {/* 核心导航 */}
          <div className="flex items-center gap-6">
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

          {/* 次级导航 —— 推到右边，视觉降级 */}
          <div className="ml-auto flex items-center gap-5">
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
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border-subtle)] px-6 py-4 text-xs text-[var(--text-tertiary)] text-center">
        invest · connectors/web_api.py · Cloudflare Access
      </footer>
    </div>
  );
}
