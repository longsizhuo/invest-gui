import { Dialog, Field, Button, inputClass, selectClass } from "invest-gui";

const noop = () => {};

export const Deposit = () => (
  <Dialog open onClose={noop} title="存款 / Deposit">
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="币种 / Currency">
        <select className={selectClass} defaultValue="CNY">
          <option value="CNY">CNY ¥</option>
          <option value="AUD">AUD A$</option>
          <option value="USD">USD $</option>
        </select>
      </Field>
      <Field label="金额 / Amount" hint="记入现金账本，不连接真实支付">
        <input className={inputClass} defaultValue="48200.00" />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={noop}>取消</Button>
        <Button variant="primary" onClick={noop}>确认存入</Button>
      </div>
    </div>
  </Dialog>
);

export const Confirm = () => (
  <Dialog open onClose={noop} title="确认清仓 NDQ.AX">
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        将卖出全部 120 股 NDQ.AX，预计结算{" "}
        <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)" }}>
          A$4,812.00
        </span>{" "}
        计入 AUD 现金。此操作会同步更新持仓与现金账本。
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={noop}>返回</Button>
        <Button variant="danger" onClick={noop}>确认卖出</Button>
      </div>
    </div>
  </Dialog>
);
