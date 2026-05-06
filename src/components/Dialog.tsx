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
      className="rounded-lg bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700 p-0 backdrop:bg-black/60 max-w-md w-full"
      // 点击 backdrop 关闭
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 text-xl leading-none"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
