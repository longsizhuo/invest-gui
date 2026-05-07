import { useEffect, useRef } from "react";

/**
 * TradingView Advanced Chart widget 嵌入
 *
 * 浏览器侧加载 s3.tradingview.com 的 JS，不经过 invest 后端。
 * 接收 yfinance 格式的 symbol，自动映射到 TradingView 格式。
 *
 * 已知 yfinance → TradingView 的映射（不全 → fallback 原样传入，让用户在 widget 里搜）
 */

/** yfinance symbol → TradingView symbol 映射规则 */
function mapToTradingView(yfSymbol: string): string {
  const s = yfSymbol.trim();

  // 显式映射表（精确匹配）
  // 期货合约（COMEX:GC1! 等）TradingView 需要付费订阅才能看实时数据，
  // 改用现货/外汇代理（OANDA / TVC），免费用户可看且和 yfinance 期货价相关性 0.99+
  const exact: Record<string, string> = {
    "GC=F": "OANDA:XAUUSD",        // 现货金 USD/oz（vs 期货 COMEX:GC1! 需付费）
    "SI=F": "OANDA:XAGUSD",        // 现货银
    "CL=F": "TVC:USOIL",           // WTI 原油（TVC 免费）
    "HG=F": "TVC:COPPER",          // 铜
    "ES=F": "SP:SPX",              // 标普 500 现货指数（vs ES1! 需付费）
    "NQ=F": "NASDAQ:NDX",          // 纳指 100 现货指数（vs NQ1! 需付费）
    "^VIX": "TVC:VIX",
    "^TNX": "TVC:US10Y",
    "^GSPC": "SP:SPX",
    "^IXIC": "NASDAQ:IXIC",
    "^DJI": "DJ:DJI",
    "USDCNY=X": "FX_IDC:USDCNY",
    "AUDCNY=X": "FX_IDC:AUDCNY",
    "EURCNY=X": "FX_IDC:EURCNY",
    "USDJPY=X": "FX:USDJPY",
    "EURUSD=X": "FX:EURUSD",
    "GBPUSD=X": "FX:GBPUSD",
    "AUDUSD=X": "FX:AUDUSD",
    "BTC-USD": "COINBASE:BTCUSD",
    "ETH-USD": "COINBASE:ETHUSD",
  };
  if (exact[s]) return exact[s];

  // 后缀规则：交易所代码
  // .AX = 澳交所
  if (s.endsWith(".AX")) return `ASX:${s.slice(0, -3)}`;
  // .SS / .SZ = 上交所 / 深交所
  if (s.endsWith(".SS")) return `SSE:${s.slice(0, -3)}`;
  if (s.endsWith(".SZ")) return `SZSE:${s.slice(0, -3)}`;
  // .HK = 港交所
  if (s.endsWith(".HK")) return `HKEX:${s.slice(0, -3)}`;
  // .L = 伦交所
  if (s.endsWith(".L")) return `LSE:${s.slice(0, -2)}`;
  // .T = 东交所
  if (s.endsWith(".T")) return `TSE:${s.slice(0, -2)}`;

  // FX/期货通用模式：=X / =F 后缀剥掉
  if (s.endsWith("=X")) return `FX_IDC:${s.slice(0, -2)}`;
  if (s.endsWith("=F")) return s.slice(0, -2); // 让 TV 自己识别

  // 美股通常无前缀，让 TV 自己定位
  return s;
}

export function TradingViewChart({
  symbol,
  height = 360,
  interval = "D",
}: {
  /** yfinance 格式的 symbol，如 NDQ.AX / GC=F / AAPL */
  symbol: string;
  height?: number;
  interval?: "1" | "5" | "15" | "60" | "240" | "D" | "W" | "M";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvSymbol = mapToTradingView(symbol);
  const containerId = `tv_${tvSymbol.replace(/[^a-z0-9]/gi, "_")}_${interval}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.id = containerId;

    let script = document.querySelector<HTMLScriptElement>("script[data-tv-loader]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.dataset.tvLoader = "1";
      document.head.appendChild(script);
    }

    const init = () => {
      const W = (
        window as unknown as { TradingView?: { widget: new (cfg: unknown) => unknown } }
      ).TradingView;
      if (!W) return;
      if (!document.getElementById(containerId)) return;
      new W.widget({
        autosize: true,
        symbol: tvSymbol,
        interval,
        timezone: "Asia/Shanghai",
        theme: "dark",
        style: "1",
        locale: "zh_CN",
        toolbar_bg: "#0a0a0b",
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
      if (container) container.innerHTML = "";
    };
  }, [tvSymbol, interval, containerId]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className="overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-base)]"
    />
  );
}
