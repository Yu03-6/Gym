"use client";
import {
  useEffect,
  useRef,
  useId,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { X, Plus, ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { error } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={heading}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={heading}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button className="icon-button" onClick={onClose} aria-label="关闭">
          <X size={22} />
        </button>
      </div>
      <div className="modal-body">
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button variant="secondary" onClick={onAction}>
          <Plus size={18} />
          {action}
        </Button>
      )}
    </div>
  );
}
export function SectionHead({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowUpRight size={18} />
        </button>
      )}
    </div>
  );
}
export function FormError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="form-error">
      {message}
    </p>
  ) : null;
}
export function Confirm({
  title,
  description,
  onCancel,
  onConfirm,
  danger = false,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="body-copy">{description}</p>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          确认
        </Button>
      </div>
    </Modal>
  );
}
export const round = (n: number, decimals = 0) =>
  n.toLocaleString("zh-CN", { maximumFractionDigits: decimals });
