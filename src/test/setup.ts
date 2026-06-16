// Vitest 全局 setup：注入 @testing-library/jest-dom 的自定义 matcher
// （toBeInTheDocument / toHaveTextContent 等）+ 每个测试后自动清理 DOM。
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
