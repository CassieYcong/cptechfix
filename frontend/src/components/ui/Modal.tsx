import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

export const Modal: React.FC<{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: string; dim?: boolean }> = ({ open, onClose, title, children, size = "max-w-lg" }) => {
  const [visible, setVisible] = React.useState(open);
  const [closing, setClosing] = React.useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = setTimeout(() => { setVisible(false); setClosing(false); }, 200);
      return () => clearTimeout(t);
    }
  }, [open, visible]);

  // Lock background scrolling only while the dialog is open, and restore the
  // previous value (other overlays may have set it) instead of hard-coding "".
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!visible) return null;

  // Render into <body> so no ancestor transform/filter/overflow (e.g. the
  // dashboard's fade-in wrapper) can become the containing block for our
  // fixed-position overlay and shift or clip the dialog.
  return ReactDOM.createPortal(
    <>
      {/* Backdrop: dims and blurs only the page behind the dialog. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[9998] bg-black/55 backdrop-blur-[4px] ${closing ? "animate-overlayOut" : "animate-overlayIn"}`}
      />
      {/* Transparent interaction layer keeps the dialog above the backdrop and
          blocks clicks/scroll on the page underneath. */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain"
      >
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${size} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl ${closing ? "animate-scaleOut" : "animate-scaleIn"}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 p-5">
              <h3 className="min-w-0 break-words text-lg font-bold text-navy">{title}</h3>
              <button onClick={onClose} aria-label="Close dialog" className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export const ConfirmDialog: React.FC<{ open: boolean; onClose: () => void; onConfirm: () => void; title?: string; message?: string; loading?: boolean }> = ({ open, onClose, onConfirm, title = "Confirm", message = "Are you sure?", loading }) => (
  <Modal open={open} onClose={onClose} title={title} size="max-w-md">
    <p className="text-slate-700 mb-5">{message}</p>
    <div className="flex justify-end gap-2">
      <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">Cancel</button>
      <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50 hover:bg-red-700">{loading ? "..." : "Confirm"}</button>
    </div>
  </Modal>
);

export const SuccessModal: React.FC<{ open: boolean; onClose: () => void; title?: string; message?: string }> = ({ open, onClose, title = "Success", message }) => (
  <Modal open={open} onClose={onClose} title={title} size="max-w-md">
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">✓</div>
      <p className="text-slate-700">{message}</p>
    </div>
    <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-brandgreen text-white font-medium">OK</button></div>
  </Modal>
);

export const ErrorModal: React.FC<{ open: boolean; onClose: () => void; title?: string; message?: string }> = ({ open, onClose, title = "Error", message }) => (
  <Modal open={open} onClose={onClose} title={title} size="max-w-md">
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">!</div>
      <p className="text-red-700">{message}</p>
    </div>
    <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium">OK</button></div>
  </Modal>
);

export const LoginRequiredModal: React.FC<{ open: boolean; onClose: () => void; message?: string }> = ({ open, onClose, message }) => {
  const nav = (path: string) => { onClose(); window.location.href = path; };
  return (
    <Modal open={open} onClose={onClose} title="Login Required!" size="max-w-md">
      <p className="text-slate-600 mb-5">{message || "Please log in to your account or create a new account before adding products to your cart."}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => nav("/login")} className="flex-1 py-2.5 rounded-lg bg-[#1d4ed8] text-white font-semibold hover:bg-[#1e40af] transition">Log In</button>
        <button onClick={() => nav("/register")} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition">Create Account</button>
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition">Cancel</button>
      </div>
    </Modal>
  );
};
