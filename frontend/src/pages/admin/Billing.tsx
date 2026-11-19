import React from "react";
import api from "../../lib/axios";
import { Card, Button, Input, Badge } from "../../components/ui";
import { Modal, SuccessModal, ErrorModal } from "../../components/ui/Modal";
import { PaymentModal } from "../../components/ui/PaymentModal";

export const AdminBilling: React.FC = () => {
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [payOpen, setPayOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const load = async () => { const r = await api.get("/billing/history"); setInvoices(r.data); };
  React.useEffect(() => { load(); }, []);

  const pay = async (method: string) => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post("/payments/walk-in", { orderId: selected.orderId, repairId: selected.repairId, amount: Number(selected.balance || selected.totalAmount), paymentMethod: method });
      setPayOpen(false); setMsg("Payment recorded"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-4">Billing & Payments</h1>
      <div className="grid grid-cols-1 gap-3">
        {invoices.map((inv) => (
          <Card key={inv.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-navy">{inv.invoiceNumber}</div>
                <div className="text-sm text-gray-600 break-words">Total: ₱{Number(inv.totalAmount).toFixed(2)} | Paid: ₱{Number(inv.amountPaid).toFixed(2)} | Balance: ₱{Number(inv.balance).toFixed(2)}</div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {Number(inv.balance) > 0 && <Button onClick={() => { setSelected(inv); setPayOpen(true); }}>Record Payment</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} onPay={pay} amount={selected ? Number(selected.balance || selected.totalAmount) : 0} loading={loading} />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};
