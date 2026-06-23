import { Field, inputClass, selectClass } from "invest-gui";

export const Inputs = () => (
  <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 16 }}>
    <Field label="标的 / Symbol" hint="任意 yfinance symbol，如 AAPL / 600519.SS">
      <input className={inputClass} defaultValue="NDQ.AX" />
    </Field>
    <Field label="买入价 / Avg cost">
      <input className={inputClass} defaultValue="32.10" />
    </Field>
  </div>
);

export const Select = () => (
  <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 16 }}>
    <Field label="币种 / Currency">
      <select className={selectClass} defaultValue="AUD">
        <option value="CNY">CNY ¥</option>
        <option value="AUD">AUD A$</option>
        <option value="USD">USD $</option>
      </select>
    </Field>
    <Field label="持有份额 / Shares" hint="可填小数，A 股按整百约束在提交时校验">
      <input className={inputClass} defaultValue="120" />
    </Field>
  </div>
);

export const Placeholder = () => (
  <div style={{ width: 360 }}>
    <Field label="备注 / Note">
      <input className={inputClass} placeholder="例如：定投补仓" />
    </Field>
  </div>
);
