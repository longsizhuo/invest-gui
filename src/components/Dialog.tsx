import { ReactNode, useEffect, useRef } from "react";

/**
 * 简单 Modal：基于原生 <dialog>，浏览器自带焦点管理 + ESC 关闭 + 背景点击关闭
 *
 * 用法：
 *   const [open, setOpen] = useState(false)
 *   <Dialog open={open} onClose={() => setOpen(false)} title="存款">...</Dialog>
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={
        "bg-[var(--surface-raised)] text-[var(--text-primary)] " +
        "border border-[var(--border-strong)] p-0 " +
        "backdrop:bg-black/70 backdrop:backdrop-blur-sm " +
        "max-w-md w-full"
      }
      // 点击 backdrop 关闭
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header
        className={
          "px-5 py-4 border-b border-[var(--border-subtle)] " +
          "flex items-center justify-between gap-3"
        }
      >
        <h2 className="text-base font-medium">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className={
            "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] " +
            "text-2xl leading-none w-8 h-8 flex items-center justify-center " +
            "transition-colors duration-100"
          }
          aria-label="关闭"
        >
          ×
        </button>
      </header>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
