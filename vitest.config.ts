import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 测试专用配置（与 vite.config.ts 分开，避免污染生产构建）。
// 跑测试：pnpm test（= vitest run），watch 模式：pnpm test:watch。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
