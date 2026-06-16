import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PublicStats from "./PublicStats";
import { SWR_KEYS } from "../lib/swr-keys";

// 这个测试守的是「render-phase fetch+setState」反模式的修复：
// fetch 必须发生在 useEffect 里，且 cleanup 调用 AbortController.abort()。
// 见 PublicStats.tsx 的 useEffect 注释。

/** 一个样本量 >= 30 的窗口，命中率会渲染成真实数字（而非"样本不足"） */
function window(hitRate: number, n: number) {
  return {
    hit_rate: hitRate,
    sample_size: n,
    bullish_hit_rate: 0.6,
    bearish_hit_rate: 0.55,
    hold_hit_rate: 0.7,
    bullish_n: 40,
    bearish_n: 35,
    hold_n: 50,
  };
}

const PUBLIC_STATS_FIXTURE = {
  "30d": window(0.642, 120),
  "90d": window(0.58, 300),
  all: window(0.611, 900),
  generated_at: "2026-06-16T08:00:00Z",
};

function mockFetchResolving() {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(PUBLIC_STATS_FIXTURE),
    } as Response),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("PublicStats", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches /api/stats/public from inside an effect and renders the data", async () => {
    const fetchMock = mockFetchResolving();

    render(<PublicStats />);

    // fetch 走 SWR_KEYS 常量，命中脱敏聚合端点
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe(SWR_KEYS.STATS_PUBLIC);
    expect(url).toBe("/api/stats/public");

    // signal 传入了（说明走的是 AbortController 路径）
    const init = fetchMock.mock.calls[0][1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    // promise resolve 后数据渲染出来：30d 命中率 64.2% + 样本量
    expect(await screen.findByText("64.2%")).toBeInTheDocument();
    expect(screen.getByText(/n=120/)).toBeInTheDocument();
    // 生成时间也渲染
    expect(
      screen.getByText(/2026-06-16T08:00:00Z/),
    ).toBeInTheDocument();
  });

  it("aborts the in-flight request on unmount (effect cleanup)", async () => {
    const fetchMock = mockFetchResolving();
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    const { unmount } = render(<PublicStats />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // 拿到实际传给 fetch 的 signal，卸载后它应被 abort
    const init = fetchMock.mock.calls[0][1];
    const signal = init?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);

    unmount();

    // cleanup 调用 controller.abort()
    expect(abortSpy).toHaveBeenCalled();
    expect(signal?.aborted).toBe(true);
  });
});
