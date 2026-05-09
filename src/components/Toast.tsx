import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type ToastSeverity = "info" | "warn" | "urgent";

export interface ToastItem {
  /** 唯一 ID，用于关闭/去重 */
  id: string;
  /** 展示给用户的文案 */
  message: string;
  severity: ToastSeverity;
  /** 5s 后自动消失的计时器 id */
  timerId?: ReturnType<typeof setTimeout>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  /** 推一条 toast；同 message 5 分钟内不重复弹 */
  push: (message: string, severity?: ToastSeverity) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// 5 分钟内不重复弹相同 message 的 localStorage key 前缀
const LS_PREFIX = "toast_seen:";
// 点 X 关闭后 30 分钟内不再弹
const DISMISS_TTL_MS = 30 * 60 * 1000;
// 相同 message 5 分钟内自动去重
const AUTO_DEDUP_MS = 5 * 60 * 1000;

/** 计算 message 的简单 hash，用于 localStorage key */
function msgHash(message: string): string {
  let h = 0;
  for (let i = 0; i < message.length; i++) {
    h = (Math.imul(31, h) + message.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

// ─── ToastProvider ────────────────────────────────────────────────────────────

/**
 * Toast 全局提供者
 *
 * 挂在 App 顶层，通过 useToast() 供子组件/hook 推送通知。
 * 不引入任何新依赖，仅用 Tailwind + React state。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /** 清除某条 toast 的自动消失计时器 */
  const clearTimer = useCallback((id: string) => {
    setToasts((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t?.timerId) clearTimeout(t.timerId);
      return prev;
    });
  }, []);

  /** 关闭一条 toast */
  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => {
        const t = prev.find((x) => x.id === id);
        if (t) {
          // 记录用户主动关闭，30 分钟内不再弹这条
          const key = LS_PREFIX + msgHash(t.message);
          try {
            localStorage.setItem(key, String(Date.now() + DISMISS_TTL_MS));
          } catch {
            // 隐身模式或 quota exceeded 时忽略
          }
        }
        return prev.filter((x) => x.id !== id);
      });
    },
    [clearTimer],
  );

  /** 推一条 toast，自动去重（5 分钟内相同 message 不重复弹） */
  const push = useCallback(
    (message: string, severity: ToastSeverity = "info") => {
      const hash = msgHash(message);
      const key = LS_PREFIX + hash;

      // 检查 localStorage：是否在禁止时间窗口内
      try {
        const until = parseInt(localStorage.getItem(key) ?? "0", 10);
        if (Date.now() < until) return; // 用户曾主动关闭，冷却期内跳过
      } catch {
        // 忽略 localStorage 异常
      }

      // 内存去重：当前 toast 列表里已有相同 message 则跳过
      setToasts((prev) => {
        const exists = prev.some((t) => msgHash(t.message) === hash);
        if (exists) return prev;

        const id = `${hash}-${Date.now()}`;
        // 设置 5 秒后自动消失的计时器（注意：不能在 setToasts 内直接调 dismiss，
        // 用 setTimeout 在外部 dispatch）
        const timerId = setTimeout(() => {
          setToasts((p) => p.filter((x) => x.id !== id));
        }, 5000);

        // 同时写 AUTO_DEDUP_MS 去重记录（防止页面存活期间重复弹）
        try {
          const existing = parseInt(localStorage.getItem(key) ?? "0", 10);
          if (Date.now() >= existing) {
            // 只在没有"用户主动关闭"记录时才写 auto-dedup（不覆盖更长的 TTL）
            const autoUntil = Date.now() + AUTO_DEDUP_MS;
            localStorage.setItem(key, String(autoUntil));
          }
        } catch {
          // 忽略
        }

        return [...prev, { id, message, severity, timerId }];
      });
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast 必须在 <ToastProvider> 内使用");
  return ctx;
}

// ─── 渲染层 ───────────────────────────────────────────────────────────────────

/** severity → 边框 + 文字颜色 token */
const severityStyle: Record<ToastSeverity, string> = {
  info: "border-[var(--border-strong)] text-[var(--text-primary)]",
  warn: "border-[var(--warn)] text-[var(--warn)]",
  urgent: "border-[var(--neg)] text-[var(--neg)]",
};

/** severity → 左侧指示条颜色 */
const severityBar: Record<ToastSeverity, string> = {
  info: "bg-[var(--text-tertiary)]",
  warn: "bg-[var(--warn)]",
  urgent: "bg-[var(--neg)]",
};

/**
 * ToastStack：固定在右下角，最多同时展示 5 条
 * 设计原则：尽量小，不遮主内容；按 severity 排序（urgent 在顶）
 */
function ToastStack({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}) {
  // urgent > warn > info 排序
  const sorted = [...toasts].sort((a, b) => {
    const order: Record<ToastSeverity, number> = { urgent: 0, warn: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
  // 最多显示 5 条
  const visible = sorted.slice(0, 5);

  if (visible.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="通知"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {visible.map((t) => (
        <ToastCard key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

/** 单条 Toast 卡片，带渐入动画 */
function ToastCard({
  toast,
  dismiss,
}: {
  toast: ToastItem;
  dismiss: (id: string) => void;
}) {
  // 控制渐入：首次渲染后改为 opacity-100
  const [visible, setVisible] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      // 用 rAF 让浏览器先渲染 opacity-0，然后触发 transition
      requestAnimationFrame(() => setVisible(true));
    }
  }, []);

  return (
    <div
      role="alert"
      className={[
        "pointer-events-auto",
        "bg-[var(--surface-raised)] border",
        severityStyle[toast.severity],
        "flex items-start gap-0 overflow-hidden",
        "transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      {/* 左侧 severity 指示条 */}
      <div className={`w-0.5 self-stretch shrink-0 ${severityBar[toast.severity]}`} />

      {/* 正文区 */}
      <div className="flex-1 px-3 py-2.5 text-xs leading-relaxed text-[var(--text-primary)] min-w-0">
        {toast.message}
      </div>

      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="关闭通知"
        className="shrink-0 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {/* 简单 × 字符，不额外引入 icon 库 */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <line x1="1" y1="1" x2="11" y2="11" />
          <line x1="11" y1="1" x2="1" y2="11" />
        </svg>
      </button>
    </div>
  );
}
