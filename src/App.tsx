import { NavLink, Outlet } from "react-router-dom";

/** 顶层布局：导航栏 + 路由出口 */
export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <span className="font-bold text-gold-500 text-lg">💰 invest</span>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm transition ${isActive ? "text-gold-400 font-semibold" : "text-zinc-400 hover:text-zinc-100"}`
            }
          >
            主面板
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `text-sm transition ${isActive ? "text-gold-400 font-semibold" : "text-zinc-400 hover:text-zinc-100"}`
            }
          >
            交易流水
          </NavLink>
          <NavLink
            to="/strategy"
            className={({ isActive }) =>
              `text-sm transition ${isActive ? "text-gold-400 font-semibold" : "text-zinc-400 hover:text-zinc-100"}`
            }
          >
            策略
          </NavLink>
          <NavLink
            to="/committee"
            className={({ isActive }) =>
              `text-sm transition ${isActive ? "text-gold-400 font-semibold" : "text-zinc-400 hover:text-zinc-100"}`
            }
          >
            委员会
          </NavLink>
          <NavLink
            to="/system"
            className={({ isActive }) =>
              `text-sm transition ${isActive ? "text-gold-400 font-semibold" : "text-zinc-400 hover:text-zinc-100"}`
            }
          >
            系统
          </NavLink>
          <NavLink
            to="/transparency"
            className={({ isActive }) =>
              `text-sm transition ${isActive ? "text-gold-400 font-semibold" : "text-zinc-400 hover:text-zinc-100"}`
            }
          >
            🔬 透视
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500 text-center">
        invest GUI · 数据来自 connectors/web_api.py · 鉴权由 Cloudflare Access 在边缘完成
      </footer>
    </div>
  );
}
