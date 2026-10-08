import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AccuracyTab } from "./AccuracyTab";
import { SWR_KEYS } from "../../lib/swr-keys";

// 守 ADR-022 / D4：只渲染 live 桶；n<30 的 null 命中率不崩、显示 "—"；非业绩桶只列 n。
const bucket = (n: number, label: string, extra = {}) => ({
  n, label, is_performance: false, rates_suppressed_sub30: n < 30,
  by_window: {}, by_verdict: {}, directional_only_hit_rate: null, directional_n: 0, ...extra,
});

const SUMMARY = {
  total: 1039,
  weekend_dup_excluded: 4,
  has_report_md: false,
  live: bucket(35, "live 实盘决议（唯一业绩口径）", {
    is_performance: true,
    by_window: { "30d": { n: 35, hit_rate: 0.6 } },
    by_verdict: { ACCUMULATE: { n: 5, avg_confidence: 0.6, hit_rate_1d: null, hit_rate_7d: null, hit_rate_30d: null } },
    directional_n: 5,
  }),
  backtest: bucket(1000, "回测干净段（非业绩）"),
  contaminated: bucket(0, "污染桶"),
};

afterEach(() => vi.unstubAllGlobals());

describe("AccuracyTab", () => {
  it("renders live bucket only and lists non-performance buckets by n", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map(), fallback: { [SWR_KEYS.VERDICT_REVIEW_SUMMARY]: SUMMARY } }}>
        <AccuracyTab />
      </SWRConfig>,
    );
    expect((await screen.findAllByText("35")).length).toBeGreaterThan(0); // live n
    expect(screen.queryByText("1039")).toBeNull();                    // 不展示 jsonl 总行数
    expect(screen.getByText(/周五样本重复）4 条不计入/)).toBeTruthy();  // D8 周末重复计数
    expect(screen.getAllByText("60.0%").length).toBeGreaterThan(0); // live 30d
    expect(screen.getByText(/回测干净段（非业绩）：1000 条/)).toBeTruthy();
    expect(screen.queryByText(/污染桶/)).toBeNull();                 // n=0 不列
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);       // null 命中率不崩
  });
});
