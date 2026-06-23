import { CashDialog } from "invest-gui";

// 存入现金 —— primary 确认按钮。
export const Deposit = () => (
  <CashDialog mode="deposit" open onClose={() => {}} />
);

// 取出现金 —— danger 确认按钮。
export const Withdraw = () => (
  <CashDialog mode="withdraw" open onClose={() => {}} />
);
