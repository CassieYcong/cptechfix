import React from "react";
import { Modal } from "./Modal";
import { Button } from "./index";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { CreditCard, Wallet, Banknote, Store, Building2, Camera, Copy, RefreshCw, X } from "lucide-react";
import gcashlogo from "../../assets/gcashlogo.png";
import paymayalogo from "../../assets/paymayalogo.png";

export interface PaymentMethodOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  logo?: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "GCash", label: "GCash", description: "Pay via GCash wallet", icon: <Wallet size={20} />, color: "from-blue-500 to-blue-700", logo: gcashlogo },
  { id: "Maya", label: "Maya", description: "Pay via Maya wallet", icon: <Wallet size={20} />, color: "from-emerald-500 to-emerald-700", logo: paymayalogo },
  { id: "Card", label: "Debit / Credit Card", description: "Visa, Mastercard, JCB", icon: <CreditCard size={20} />, color: "from-slate-600 to-slate-800" },
  { id: "Bank Transfer", label: "Bank Transfer", description: "Online banking", icon: <Building2 size={20} />, color: "from-indigo-500 to-indigo-700" },
  { id: "COD", label: "Cash on Delivery", description: "Pay when item arrives", icon: <Banknote size={20} />, color: "from-amber-500 to-amber-700" },
  { id: "Cash", label: "Cash at Store", description: "Pay at the shop", icon: <Store size={20} />, color: "from-green-500 to-green-700" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPay: (method: string) => void;
  amount: number;
  loading?: boolean;
  orderId?: string;
  customerName?: string;
  paymentRef?: string;
  qrPayload?: string;
  status?: string;
  onVerifyReference?: (ref: string) => void;
  onCancel?: () => void;
  onRegenerate?: () => void;
}

export const PaymentModal: React.FC<Props> = ({
  open, onClose, onPay, amount, loading, orderId, customerName, paymentRef, qrPayload, status,
  onVerifyReference, onCancel, onRegenerate,
}) => {
  const [method, setMethod] = React.useState("GCash");
  const [manualRef, setManualRef] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState("");
  const scannerRef = React.useRef<any>(null);
  const scannerDivId = "pm-qr-reader";

  React.useEffect(() => {
    if (!open) {
      // stop scanner if open
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => { scannerRef.current = null; });
        setScanning(false);
      }
    }
  }, [open]);

  const startScan = async () => {
    setScanError("");
    try {
      const html5Qr = new Html5Qrcode(scannerDivId);
      scannerRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          setManualRef(decodedText);
          html5Qr.stop().catch(() => {}).finally(() => { scannerRef.current = null; setScanning(false); });
          if (onVerifyReference) onVerifyReference(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (e: any) {
      setScanError(e?.message || "Camera access denied or unavailable.");
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const copyRef = () => {
    if (paymentRef) navigator.clipboard?.writeText(paymentRef).catch(() => {});
  };

  const statusColor = (s?: string) => {
    if (s === "PAID") return "text-emerald-600";
    if (s === "FAILED" || s === "EXPIRED" || s === "CANCELLED") return "text-red-600";
    return "text-amber-600";
  };

  return (
    <Modal open={open} onClose={onClose} title="Payment" size="max-w-lg">
      <div className="space-y-4">
        {/* Order info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {orderId && <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Order</div><div className="font-semibold text-navy">{orderId}</div></div>}
          {customerName && <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Customer</div><div className="font-semibold text-navy">{customerName}</div></div>}
          <div className="bg-slate-50 rounded-lg p-3 col-span-2">
            <div className="text-slate-500 text-xs">Amount Payable</div>
            <div className="font-extrabold text-navy text-xl">₱{amount.toFixed(2)}</div>
          </div>
        </div>

        {/* Payment method selection */}
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">Payment Method</div>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.filter((m) => ["GCash", "Maya", "Card", "Bank Transfer", "COD", "Cash"].includes(m.id)).map((m) => (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition ${method === m.id ? "border-brandgreen bg-brandgreen/5" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="w-10 h-8 rounded-md bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {m.logo ? <img src={m.logo} alt={m.label} className="w-full h-full object-contain" /> : <div className={`w-full h-full bg-gradient-to-br ${m.color} text-white flex items-center justify-center`}>{m.icon}</div>}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-navy text-xs">{m.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className={`text-sm font-semibold ${statusColor(status)}`}>
            Status: {status}
          </div>
        )}

        {/* QR code display */}
        {qrPayload && (
          <div className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl">
            <QRCodeSVG value={qrPayload} size={180} />
            {paymentRef && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-600">{paymentRef}</span>
                <button onClick={copyRef} className="text-brandgreen hover:text-green-700"><Copy size={12} /></button>
              </div>
            )}
            <p className="text-xs text-slate-500">Scan this QR with your {method} app</p>
          </div>
        )}

        {/* Camera scanner */}
        <div className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Camera size={14} /> Scan Payment QR</span>
            {!scanning ? (
              <Button size="sm" variant="secondary" onClick={startScan}>Start Scanner</Button>
            ) : (
              <Button size="sm" variant="danger" onClick={stopScan}>Stop</Button>
            )}
          </div>
          <div id={scannerDivId} className="w-full" />
          {scanError && <p className="text-xs text-red-600 mt-1">{scanError}</p>}
        </div>

        {/* Manual reference input */}
        <div className="flex gap-2">
          <input
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
            placeholder="Enter payment reference manually"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <Button size="sm" variant="secondary" onClick={() => { if (manualRef && onVerifyReference) onVerifyReference(manualRef); }}>
            Verify
          </Button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1" disabled={loading} onClick={() => onPay(method)}>
            {loading ? "Processing..." : "Generate Payment"}
          </Button>
          {onRegenerate && <Button variant="secondary" size="sm" onClick={onRegenerate}><RefreshCw size={14} /> Regenerate</Button>}
          {onCancel && <Button variant="danger" size="sm" onClick={onCancel}>Cancel Payment</Button>}
        </div>
      </div>
    </Modal>
  );
};