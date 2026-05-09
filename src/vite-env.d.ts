/// <reference types="vite/client" />

/**
 * 自定义 Vite env 变量类型声明
 * 见 .env.example
 */
interface ImportMetaEnv {
  readonly VITE_INSTANCE_NAME?: string;
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
