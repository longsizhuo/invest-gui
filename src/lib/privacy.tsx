import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * 隐私模式（"小眼睛"模式）
 *
 * 公共场合点一下顶导的眼睛 → 所有绝对金额变 ●●●●●，避免 shoulder surfing。
 *
 * 脱敏范围：
 *   ✅ CNY/AUD/USD 金额、克数、股数、avg_cost、market_value、pnl 数值
 *   ❌ 不脱敏：百分比 (+2.3%)、verdict (BUY/HOLD)、symbol (NDQ.AX)、时间戳、健康状态
 *      —— 这些公共场合露出无害且对功能必要
 *
 * 持久化：localStorage["invest-privacy-mode"] = "1" / "0"
 *   ↑ 刷新后保持上次状态；首次访问默认关闭
 */

type PrivacyContextValue = {
  enabled: boolean;
  toggle: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue>({
  enabled: false,
  toggle: () => {},
});

const STORAGE_KEY = "invest-privacy-mode";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // localStorage 不可用（隐私浏览模式）就放弃持久化，session 内仍生效
    }
  }, [enabled]);

  return (
    <PrivacyContext.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  return useContext(PrivacyContext);
}

/**
 * 把数字脱敏成 ●●●●●● 占位（保留长度暗示量级，不让用户误以为是 0）。
 * 调用方先把数字格式化成字符串（如 "¥225,378"），由本函数决定是否替换。
 */
export function maskMoney(formatted: string, masked: boolean): string {
  if (!masked) return formatted;
  // 保留 prefix（货币符号 / 正负号）+ 用 ● 替换数字部分
  const m = formatted.match(/^([^\d-]*-?)([\d,.\s]+)(.*)$/);
  if (!m) return "●●●●";
  const [, prefix, , suffix] = m;
  return `${prefix}●●●●●${suffix}`;
}

/**
 * <Money> 组件：包装绝对金额。masked 时显示 ●●●●●●。
 *
 * 用法：
 *   <Money value={225378} format={(n) => `¥${n.toLocaleString()}`} />
 */
export function Money({
  value,
  format,
  className,
}: {
  value: number | null | undefined;
  format: (v: number) => string;
  className?: string;
}) {
  const { enabled } = usePrivacy();
  if (value == null) return <span className={className}>—</span>;
  const formatted = format(value);
  return <span className={className}>{maskMoney(formatted, enabled)}</span>;
}
