/**
 * 裁决旁的"同类决议查表"（后端 confidence_lookup：同类决议（live + 纸面舰队）30 天后怎样，
 * 末尾带样本来源「含纸面舰队样本 / 默认表 / 本机样本」/ 样本不足 / 输入缺失·强制 HOLD）+ 小字 CIO 自报原数。
 * 后端 D10 P1：自报 confidence 几乎不带信息，只留档，不再当主数字展示。
 */
export function ConfidenceLookup({
  lookup,
  confidence,
}: {
  lookup?: string | null;
  confidence?: number | null;
}) {
  return (
    <>
      {lookup ?? "—"}
      {confidence != null && (
        <span className="ml-1 text-[10px] text-[var(--text-tertiary)]">
          自报 {confidence.toFixed(2)}
        </span>
      )}
    </>
  );
}
