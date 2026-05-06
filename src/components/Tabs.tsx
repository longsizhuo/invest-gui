import { useState, ReactNode } from "react";

/**
 * 通用 Tabs 组件 — 标签栏 + 内容区
 *
 * 用法：
 *   <Tabs
 *     tabs={[
 *       { id: "a", label: "标签 A", render: () => <A /> },
 *       { id: "b", label: "标签 B", hint: "说明", render: () => <B /> },
 *     ]}
 *     defaultId="a"
 *   />
 */
export interface TabDef<TId extends string = string> {
  id: TId;
  label: string;
  hint?: string;
  render: () => ReactNode;
}

export function Tabs<TId extends string = string>({
  tabs,
  defaultId,
}: {
  tabs: TabDef<TId>[];
  defaultId?: TId;
}) {
  const [active, setActive] = useState<TId>(defaultId ?? tabs[0].id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            title={t.hint}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
              active === t.id
                ? "border-gold-500 text-gold-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{activeTab.render()}</div>
    </div>
  );
}
