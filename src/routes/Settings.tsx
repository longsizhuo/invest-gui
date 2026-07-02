/**
 * Settings 页 — 唯一 GUI-only 数据入口
 *
 * 为什么需要这个页：agent（Claude / Cursor / OpenClaw / Hermes）物理上不知道
 * 用户家族多少钱 / 账户性质 —— 这些字段只能用户主动告诉系统。
 *
 * 当前唯一字段组：`wealth_context`（后端 WealthContextOfficer 新角色的数据入口）
 * - emergency_buffer_cny: 应急金 / 家族 backup 额度（**不可作投资**，仅风险兜底）
 * - family_backup_available: 是否有家族经济支持
 * - account_purpose: 账户性质（零花钱 / 长期投资 / 退休金）
 * - lifestyle_notes: 自由文本备注
 *
 * 没填则委员会回退到老逻辑（portfolio cash = 全部可调），Risk Officer 会把
 * "低 portfolio cash"机械判 high_risk。详见 docs/wiki/12-verification.md 主张 7。
 */
import { useState, useEffect, FormEvent } from "react";
import useSWR from "swr";
import { fetcher, putJSON } from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Field, inputClass, selectClass } from "../components/Field";
import { useToast } from "../components/Toast";
import { usePrivacy } from "../lib/privacy";

type WealthContext = {
  emergency_buffer_cny?: number | null;
  family_backup_available?: boolean | null;
  account_purpose?: string | null;
  lifestyle_notes?: string | null;
};

type UserProfile = {
  display_name?: string | null;
  risk_tolerance?: string | null;
  exchange_buffer_cny?: number;
  user_email?: string | null;
  wealth_context?: WealthContext | null;
};

// config-via-API（ADR-017）：白名单 tunable 行为开关
type ConfigItem = {
  key: string;
  value: boolean | string;
  overridden: boolean;
  type: string; // "bool" | "enum"
  label: string;
  help: string;
  choices?: string[] | null;
};
type ConfigResponse = { items: ConfigItem[] };

export default function Settings() {
  const { data: user, error, isLoading, mutate } = useSWR<UserProfile>(
    SWR_KEYS.USER,
    fetcher,
  );
  const { push: showToast } = useToast();
  const { enabled: privacyOn } = usePrivacy();

  // 表单本地 state
  const [bufferCny, setBufferCny] = useState<string>("");
  const [familyBackup, setFamilyBackup] = useState<"unknown" | "yes" | "no">("unknown");
  const [accountPurpose, setAccountPurpose] = useState<string>("");
  const [lifestyleNotes, setLifestyleNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 初次加载 / mutate 后同步表单
  useEffect(() => {
    const ctx = user?.wealth_context;
    if (!ctx) return;
    if (typeof ctx.emergency_buffer_cny === "number") {
      setBufferCny(String(ctx.emergency_buffer_cny));
    }
    if (typeof ctx.family_backup_available === "boolean") {
      setFamilyBackup(ctx.family_backup_available ? "yes" : "no");
    }
    if (typeof ctx.account_purpose === "string") {
      setAccountPurpose(ctx.account_purpose);
    }
    if (typeof ctx.lifestyle_notes === "string") {
      setLifestyleNotes(ctx.lifestyle_notes);
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: WealthContext = {};
      // 只发用户填了的字段（空字符串 / unknown 不发，保留后端原值）
      const buf = bufferCny.trim();
      if (buf !== "") {
        const n = Number(buf);
        if (!Number.isFinite(n) || n < 0) {
          showToast("应急金必须是非负数字", "urgent");
          setSaving(false);
          return;
        }
        payload.emergency_buffer_cny = n;
      }
      if (familyBackup !== "unknown") {
        payload.family_backup_available = familyBackup === "yes";
      }
      if (accountPurpose.trim() !== "") {
        payload.account_purpose = accountPurpose.trim();
      }
      if (lifestyleNotes.trim() !== "") {
        payload.lifestyle_notes = lifestyleNotes.trim();
      }

      await putJSON<WealthContext, UserProfile>(
        SWR_KEYS.USER_WEALTH_CONTEXT,
        payload,
      );
      await mutate();
      showToast("已保存。下次跑委员会时 WealthContextOfficer 会用上这些信息。", "info");
    } catch (e) {
      showToast(`保存失败: ${e instanceof Error ? e.message : String(e)}`, "urgent");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[var(--text-tertiary)]">加载中...</p>;
  }
  if (error) {
    return (
      <Card>
        <h2 className="text-base font-semibold mb-2">设置</h2>
        <p className="text-sm text-[var(--text-tertiary)]">
          加载 user profile 失败: {error.message}。如果是第一次用，先跑 onboarding。
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-display tracking-display-tight">设置</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          这里填的字段 agent 拿不到（agent 不知道你家族多少钱），
          但 WealthContextOfficer 会用上让委员会做更合理的风险判断。
        </p>
      </header>

      {/* User profile 只读摘要 */}
      <Card>
        <h2 className="text-sm font-semibold mb-3 text-[var(--text-tertiary)] uppercase tracking-wide">
          用户档案（只读，改在 invest-setup skill 里跑）
        </h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-[var(--text-tertiary)]">称呼</dt>
          <dd className="font-mono">{user?.display_name ?? "—"}</dd>
          <dt className="text-[var(--text-tertiary)]">风险偏好</dt>
          <dd className="font-mono">{user?.risk_tolerance ?? "—"}</dd>
          <dt className="text-[var(--text-tertiary)]">换汇周转金</dt>
          <dd className="font-mono">{privacyOn ? "¥●●●" : `¥${user?.exchange_buffer_cny ?? 0}`}</dd>
        </dl>
      </Card>

      {/* Wealth Context 表单 */}
      <Card>
        <header className="mb-4">
          <h2 className="text-base font-semibold">Off-Portfolio 财务背景</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            <strong className="text-[var(--text-secondary)]">铁律</strong>：
            这些金额 <strong>不会</strong> 被算成"加仓预算"——委员会加仓金额仍只用
            portfolio 内的现金。这里填的是"破产兜底"信息，
            让 Risk Officer 不把"低 portfolio 现金"误判为高风险。
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="应急金 / 家族 backup 额度 (CNY)"
            hint="portfolio 外的备用金，仅作风险兜底，不可作投资。留空 = 不告诉 agent"
          >
            <input
              type="number"
              min="0"
              step="1000"
              className={inputClass}
              placeholder="例: 200000 / 4000000"
              value={bufferCny}
              onChange={(e) => setBufferCny(e.target.value)}
            />
          </Field>

          <Field
            label="是否有家族经济支持"
            hint="决定 Risk Officer 把'低 portfolio 现金'当不当流动性风险"
          >
            <select
              className={selectClass}
              value={familyBackup}
              onChange={(e) => setFamilyBackup(e.target.value as "unknown" | "yes" | "no")}
            >
              <option value="unknown">
                未填 — agent 按"无 backup"保守判断
              </option>
              <option value="yes">
                是 — 家族能在意外时兜底，agent 不会因低现金喊清仓
              </option>
              <option value="no">
                否 — portfolio cash 就是全部 backup，低现金即流动性风险
              </option>
            </select>
          </Field>

          <Field
            label="账户性质"
            hint="影响 WealthContextOfficer 怎么解释你的风险承受能力给委员会听"
          >
            <div className="space-y-2">
              {[
                {
                  value: "",
                  title: "未填",
                  desc: "agent 按通用规则判断（保守倾向）",
                },
                {
                  value: "零花钱账户",
                  title: "零花钱账户",
                  desc: "短期消费 / 投机用钱，跌了不影响生活质量。委员会倾向激进，容忍较大回撤。",
                },
                {
                  value: "长期投资账户",
                  title: "长期投资账户",
                  desc: "5 年以上视野，能承受波动换长期复利。委员会平衡 alpha 和回撤。",
                },
                {
                  value: "退休金",
                  title: "退休金",
                  desc: "不可亏损为主，本金安全 > 收益。委员会强烈倾向保守 / 减仓。",
                },
                {
                  value: "教育金",
                  title: "教育金",
                  desc: "有明确时间窗（孩子上学等）。临近时点委员会会主动降仓位。",
                },
                {
                  value: "其他",
                  title: "其他",
                  desc: "不强制定性，agent 综合判断。",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 cursor-pointer border transition-colors ${
                    accountPurpose === opt.value
                      ? "border-[var(--accent)] bg-[var(--surface-overlay)]"
                      : "border-[var(--border-strong)] hover:border-[var(--border-strong-hover,var(--accent))]"
                  }`}
                >
                  <input
                    type="radio"
                    name="account_purpose"
                    value={opt.value}
                    checked={accountPurpose === opt.value}
                    onChange={(e) => setAccountPurpose(e.target.value)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {opt.title}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="备注（自由文本）"
            hint='示例："家族资金 ¥4M 仅作破产兜底，不可作为投资使用。加仓只能用 portfolio cash。"'
          >
            <textarea
              className={`${inputClass} font-sans`}
              rows={3}
              maxLength={512}
              value={lifestyleNotes}
              onChange={(e) => setLifestyleNotes(e.target.value)}
              placeholder="一句话告诉 agent 你的财务背景。"
            />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
            {user?.wealth_context && (
              <span className="text-xs text-[var(--text-tertiary)]">
                已设置 {Object.keys(user.wealth_context).length} 个字段
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* 委员会配置（config-via-API，ADR-017）*/}
      <CommitteeConfigCard />

      {/* 教学：为什么需要这些字段 */}
      <Card>
        <h2 className="text-sm font-semibold mb-2 text-[var(--text-tertiary)] uppercase tracking-wide">
          为什么 agent 需要这些
        </h2>
        <div className="text-sm space-y-2 text-[var(--text-secondary)]">
          <p>
            没填 wealth_context 时：用户 portfolio cash 仅 ¥500 + NDQ 重仓 99.9%
            → Risk Officer 报 <strong>high_risk</strong>，CIO 建议<strong>立即减仓 60%</strong>。
            <em>但用户家族有 ¥4M 备用金，根本不存在流动性风险。</em>
          </p>
          <p>
            填了 wealth_context 后：Risk Officer 看到 SOLVENCY_BUFFER=strong，
            SIGNAL 降到 <strong>concerned</strong>，CIO 建议"集中度仍高但流动性 OK，
            加仓上限 ≤¥50（portfolio cash 10%）"。
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-3">
            完整 E2E 实测对比见{" "}
            <a
              href="https://github.com/longsizhuo/openInvest/blob/main/docs/wiki/12-verification.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--accent)]"
            >
              docs/wiki/12-verification.md 主张 7
            </a>
            。
          </p>
        </div>
      </Card>
    </div>
  );
}

/**
 * 委员会配置（config-via-API，ADR-017）—— 运行时可调的白名单行为开关。
 * 落盘 memory/.state/config_overrides.json，优先级高于 env，web/cron/skill 三进程共读。
 * agent 等价用 `skill config [--set K V] [--clear K]`。
 */
/** 非 bool/enum 的 config 值（int/float/cron 字符串等）用文本输入编辑，
 *  失焦或回车提交。此前这类 key 被兜底渲染成「开启/关闭」布尔下拉，
 *  onChange 会 PUT true/false 直接写坏数值——2026-07-03 随 event.watch_schedule 一起修。 */
function TextConfigInput({
  value,
  disabled,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // 后端值变了（保存成功 / 别处改了）同步回输入框
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft.trim() !== value) onCommit(draft.trim());
  };
  return (
    <input
      className={`${inputClass} font-mono`}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function CommitteeConfigCard() {
  const { data, mutate } = useSWR<ConfigResponse>(SWR_KEYS.CONFIG, fetcher);
  const { push: showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function change(key: string, value: boolean | string) {
    setBusy(key);
    try {
      await putJSON<{ key: string; value: boolean | string }, ConfigResponse>(
        SWR_KEYS.CONFIG,
        { key, value },
      );
      await mutate();
      showToast("已保存。下次跑委员会即生效（三路径共读）。", "info");
    } catch (e) {
      showToast(`保存失败: ${e instanceof Error ? e.message : String(e)}`, "urgent");
    } finally {
      setBusy(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <Card>
      <header className="mb-4">
        <h2 className="text-base font-semibold">委员会配置</h2>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          运行时行为开关（落盘持久、优先级高于环境变量；agent 等价用{" "}
          <code className="font-mono">skill config</code>）。单资产 / 刻意集中策略可在这里
          关掉「集中度减仓」纠缠。
        </p>
      </header>

      <div className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)]">加载中…</p>
        )}
        {items.map((it) => (
          <Field key={it.key} label={it.label} hint={it.help}>
            {it.type === "enum" && it.choices ? (
              <select
                className={selectClass}
                value={String(it.value)}
                disabled={busy === it.key}
                onChange={(e) => change(it.key, e.target.value)}
              >
                {it.choices.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : it.type === "bool" ? (
              <select
                className={selectClass}
                value={it.value ? "true" : "false"}
                disabled={busy === it.key}
                onChange={(e) => change(it.key, e.target.value === "true")}
              >
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            ) : (
              // int / float / cron 等：文本输入，失焦或回车提交（后端按白名单 type 强转+校验）
              <TextConfigInput
                value={String(it.value ?? "")}
                disabled={busy === it.key}
                onCommit={(v) => change(it.key, v)}
              />
            )}
            {it.overridden && (
              <span className="text-xs text-[var(--accent)] mt-1 inline-block">
                已自定义（覆盖默认）
              </span>
            )}
          </Field>
        ))}
      </div>
    </Card>
  );
}
