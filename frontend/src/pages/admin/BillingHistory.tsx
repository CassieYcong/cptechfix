import React from "react";
import api from "../../lib/axios";
import { Card } from "../../components/ui";

export const AdminBillingHistory: React.FC = () => {
  const [invoices, setInvoices] = React.useState<any[]>([]);
  React.useEffect(() => { (async () => { try { setInvoices((await api.get("/billing/history")).data); } catch {} })(); }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-4">Billing History</h1>
      <div className="grid grid-cols-1 gap-3">
        {invoices.map((inv) => (
          <Card key={inv.id} className="p-4">
            <div className="font-semibold text-navy">{inv.invoiceNumber}</div>
            <div className="text-sm text-gray-600 break-words">Total: ₱{Number(inv.totalAmount).toFixed(2)} | Paid: ₱{Number(inv.amountPaid).toFixed(2)} | Balance: ₱{Number(inv.balance).toFixed(2)}</div>
            <div className="text-sm text-gray-500">{new Date(inv.createdAt).toLocaleString()}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};
