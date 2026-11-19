import React from "react";
import api from "../../lib/axios";
import { Card, Badge } from "../../components/ui";
import { Package, Wrench, CreditCard, Receipt } from "lucide-react";

export const Tracking: React.FC = () => {
  const [repairs, setRepairs] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  React.useEffect(() => {
    (async () => {
      try { setRepairs((await api.get("/repairs")).data); setOrders((await api.get("/orders")).data); } catch {}
    })();
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Tracking</h1>
        <p className="text-slate-500 text-sm mt-1">Live status of your repairs and orders</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><Wrench size={18} className="text-navy" /><h3 className="font-bold text-navy">Repairs</h3></div>
          <div className="space-y-3">
            {repairs.length === 0 && <p className="text-slate-400 text-sm">No repairs.</p>}
            {repairs.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-navy break-words">{r.referenceNumber}</div>
                  <div className="text-xs text-slate-500 break-words">{r.deviceType}</div>
                </div>
                <Badge color={r.status === "COMPLETED" ? "green" : r.status === "CANCELLED" ? "red" : "blue"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><Package size={18} className="text-brandgreen" /><h3 className="font-bold text-navy">Orders</h3></div>
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-slate-400 text-sm">No orders.</p>}
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-navy break-words">{o.orderNumber}</div>
                  <div className="text-xs text-slate-500">₱{Number(o.totalAmount).toFixed(2)}</div>
                </div>
                <Badge color={o.orderStatus === "COMPLETED" ? "green" : o.orderStatus === "CANCELLED" ? "red" : "blue"}>{o.orderStatus}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const BillingHistory: React.FC = () => {
  const [invoices, setInvoices] = React.useState<any[]>([]);
  React.useEffect(() => { (async () => { try { setInvoices((await api.get("/billing/history")).data); } catch {} })(); }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Billing History</h1>
        <p className="text-slate-500 text-sm mt-1">Your invoices and payments</p>
      </div>
      {invoices.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No billing records yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {invoices.map((inv) => (
            <Card key={inv.id} className="p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-navy/10 text-navy flex items-center justify-center"><Receipt size={20} /></div>
                  <div className="min-w-0">
                    <div className="font-bold text-navy break-words">{inv.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">{new Date(inv.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm min-w-0">
                  <div><div className="text-slate-500 text-xs">Total</div><div className="font-semibold text-navy">₱{Number(inv.totalAmount).toFixed(2)}</div></div>
                  <div><div className="text-slate-500 text-xs">Paid</div><div className="font-semibold text-brandgreen">₱{Number(inv.amountPaid).toFixed(2)}</div></div>
                  <div><div className="text-slate-500 text-xs">Balance</div><div className="font-semibold text-red-600">₱{Number(inv.balance).toFixed(2)}</div></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
