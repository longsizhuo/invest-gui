import { useEffect, useRef } from "react";

/**
 * TradingView Advanced Chart widget 嵌入
 *
 * 浏览器侧加载 s3.tradingview.com 的 JS，不经过 invest 后端，
 * 因此不消耗后端带宽，CF Access 也不影响图表加载（图表是浏览器端拉数据）。
 *
 * 支持 symbol：
 *   - 黄金现货：OANDA:XAUUSD（USD/oz，反映国际金价）
 *   - 黄金期货：COMEX:GC1!（CME 黄金期货）
 *   - NDQ.AX:   ASX:NDQ
 *
 * 注意：每个 widget 实例只能 init 一次。React 严格模式 dev 下会 mount 两次，
 * 这里 useRef 守门避免重复挂载。
 */
export function TradingViewChart({
  symbol,
  height = 360,
  interval = "D",
}: {
  symbol: string;
  height?: number;
  interval?: "1" | "5" | "15" | "60" | "240" | "D" | "W" | "M";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = `tv_${symbol.replace(/[^a-z0-9]/gi, "_")}_${interval}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.id = containerId;

    // 全局 tv.js 脚本只引入一次
    let script = document.querySelector<HTMLScriptElement>("script[data-tv-loader]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.dataset.tvLoader = "1";
      document.head.appendChild(script);
    }

    const init = () => {
      const W = (window as unknown as { TradingView?: { widget: new (cfg: unknown) => unknown } }).TradingView;
      if (!W) return;
      // 容器存在才初始化（防止 unmount 后回调）
      if (!document.getElementById(containerId)) return;
      new W.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "Asia/Shanghai",
        theme: "dark",
        style: "1",
        locale: "zh_CN",
        toolbar_bg: "#18181b",
        enable_publishing: false,
        allow_symbol_change: false,
        hide_side_toolbar: true,
        save_image: false,
        container_id: containerId,
      });
    };

    if (script.dataset.loaded === "1") {
      init();
    } else {
      script.addEventListener("load", () => {
        script!.dataset.loaded = "1";
        init();
      });
    }
    return () => {
      // 清空容器，避免重复挂载残留
      if (container) container.innerHTML = "";
    };
  }, [symbol, interval, containerId]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className="rounded-lg overflow-hidden ring-1 ring-zinc-800 bg-zinc-950"
    />
  );
}
