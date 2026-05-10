import { useState } from "react";
import { ApiError, postJSON } from "../../lib/api-client";
import { Field, inputClass, selectClass } from "../../components/Field";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Toast";

/**
 * PushTab — QQ 推送通道配置
 *
 * 功能：
 * 1. 启用/停用开关
 * 2. 填写 QQ 群号 / QQ 号
 * 3. 消息模板预览（展示 plain_verdict 50 字格式）
 * 4. "发送测试" button（调 POST /api/push/test，后端 dev-core 稍后实现）
 *
 * 存储策略：当前版本把配置存在 localStorage，后端接入后再改 POST /api/push/config。
 */

const STORAGE_KEY = "push_config_v1";

interface PushConfig {
  /** 是否启用推送 */
  enabled: boolean;
  /** 推送目标类型 */
  targetType: "group" | "user";
  /** QQ 群号或 QQ 号 */
  targetId: string;
}

function loadConfig(): PushConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PushConfig;
  } catch { /* 读不到就用默认 */ }
  return { enabled: false, targetType: "group", targetId: "" };
}

function saveConfig(cfg: PushConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* quota 满忽略 */ }
}

/** 渲染消息模板预览：模拟 plain_verdict 50 字格式 */
function TemplatePreview({ targetType, targetId }: { targetType: string; targetId: string }) {
  const target = targetId
    ? `${targetType === "group" ? "群" : "QQ"} ${targetId}`
    : "（未配置目标）";

  // 模拟 plain_verdict 格式（实际由后端生成）
  // 金融视角红线：推送内容不含 BUY/SELL 方向 + 不含具体金额 —— 避免变成"操盘信号源"。
  // 推送只做"提醒去看 memo"，决策权 + 金额仍归用户读完委员会辩论后自己定。
  const exampleMsg = `[openInvest] NDQ.AX 委员会新决议已就绪
仅供参考，详见完整 memo 后自行决策。
打开：http://127.0.0.1:8765/committee`;

  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
          消息模板预览
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          推送到：{target}
        </span>
      </div>
      <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-mono">
        {exampleMsg}
      </pre>
      <p className="text-xs text-[var(--text-tertiary)]">
        推送只做"提醒"，不含买卖方向 / 金额 —— 决策需打开 GUI 读完整 memo。
      </p>
    </div>
  );
}

export function PushTab() {
  const [cfg, setCfg] = useState<PushConfig>(loadConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const { push: toast } = useToast();

  /** 保存字段变更 */
  function update(patch: Partial<PushConfig>) {
    setCfg((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
    setTestResult(null);
  }

  /** 发送测试消息 */
  async function handleTest() {
    if (!cfg.targetId.trim()) {
      setTestResult("请先填写目标 QQ 群号 / QQ 号");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // 后端 dev-core 负责实现此端点，当前版本 404 时给友好提示
      await postJSON<{ target_type: string; target_id: string }, { ok: boolean }>(
        "/api/push/test",
        { target_type: cfg.targetType, target_id: cfg.targetId },
      );
      setTestResult("测试消息已发送，请在 QQ 侧确认收到");
      toast("推送测试成功", "info");
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404
          ? "后端推送端点尚未实现（/api/push/test），dev-core Sprint 1 会补上"
          : err instanceof ApiError
            ? err.detail
            : String(err);
      setTestResult(msg);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">QQ 推送配置</h2>
        <p className="text-xs text-[var(--text-tertiary)]">
          委员会决议完成后，自动把摘要发到指定 QQ 群 / QQ 号（需后端 OneBot11 连接正常）
        </p>
      </header>

      {/* 启用开关 */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => update({ enabled: !cfg.enabled })}
          role="switch"
          aria-checked={cfg.enabled}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && update({ enabled: !cfg.enabled })}
          className={
            "relative w-11 h-6 rounded-full border-2 transition-colors duration-150 cursor-pointer " +
            (cfg.enabled
              ? "bg-[var(--accent)] border-[var(--accent)]"
              : "bg-[var(--surface-base)] border-[var(--border-strong)]")
          }
        >
          <span
            className={
              "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 shadow-sm " +
              (cfg.enabled ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </div>
        <span className="text-sm text-[var(--text-primary)]">
          {cfg.enabled ? "推送已启用" : "推送已停用"}
        </span>
      </label>

      {/* 目标类型 */}
      <Field label="推送目标类型">
        <select
          className={selectClass}
          value={cfg.targetType}
          onChange={(e) => update({ targetType: e.target.value as "group" | "user" })}
          disabled={!cfg.enabled}
        >
          <option value="group">QQ 群</option>
          <option value="user">个人 QQ</option>
        </select>
      </Field>

      {/* 目标 ID */}
      <Field
        label={cfg.targetType === "group" ? "QQ 群号" : "QQ 号"}
        hint={
          cfg.targetType === "group"
            ? "输入 QQ 群号，NapCat Bot 必须已加入该群"
            : "输入接收方 QQ 号，Bot 必须已加为好友"
        }
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={inputClass}
          value={cfg.targetId}
          onChange={(e) => update({ targetId: e.target.value.replace(/\D/g, "") })}
          placeholder={cfg.targetType === "group" ? "例如 123456789" : "例如 987654321"}
          disabled={!cfg.enabled}
        />
      </Field>

      {/* 消息模板预览 */}
      <TemplatePreview targetType={cfg.targetType} targetId={cfg.targetId} />

      {/* 测试按钮 */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={!cfg.enabled || testing}
        >
          {testing ? "发送中..." : "发送测试消息"}
        </Button>
        {!cfg.enabled && (
          <span className="text-xs text-[var(--text-tertiary)]">需先启用推送</span>
        )}
      </div>

      {/* 测试结果反馈 */}
      {testResult && (
        <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text-primary)]">
          {testResult}
        </div>
      )}

      {/* 后端对接说明 */}
      <details className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
        <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">
          后端对接说明（dev-core 参考）
        </summary>
        <div className="mt-2 text-xs text-[var(--text-tertiary)] space-y-1 font-mono">
          <p>POST /api/push/test</p>
          <p>  body: {"{ target_type: 'group'|'user', target_id: string }"}</p>
          <p>  return: {"{ ok: true }"}</p>
          <p className="mt-2">推送实际内容走 plain_verdict 管道（50字内），</p>
          <p>经 NapCat OneBot11 HTTP API 发出。</p>
        </div>
      </details>
    </div>
  );
}
