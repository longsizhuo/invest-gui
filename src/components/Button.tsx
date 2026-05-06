import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-gold-600 hover:bg-gold-500 text-zinc-900 font-semibold",
  danger: "bg-red-600 hover:bg-red-500 text-white font-semibold",
  ghost: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 ring-1 ring-zinc-700",
};

export function Button({
  variant = "primary",
  children,
  ...props
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed rounded px-4 py-2 text-sm transition ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
