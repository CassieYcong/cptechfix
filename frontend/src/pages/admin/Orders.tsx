import React from "react";
import api from "../../lib/axios";
import { Card, Button, Badge, Input, Select } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";

const paymentStatusColor: Record<string, string> = { UNPAID: "red", PENDING: "yellow", PROCESSING: "blue", PARTIALLY_PAID: "yellow", PAID: "green", FAILED: "red", EXPIRED: "gray", REFUNDED: "purple", PARTIALLY_REFUNDED: "purple" };
export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [detail, setDetail] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<any>(null);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [form, setForm] = React.useState({ customerName: "", deliveryMethod: "DELIVERY", deliveryAddress: "" });
  const [delId, setDelId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const load = async () => { const r = await api.get("/orders"); setOrders(r.data); };
  React.useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => { const r = await api.get(`/orders/${id}`); setDetail(r.data); };

  const openEdit = (o: any) => {
    setEdit(o);
    setForm({ customerName: o.customerName || "", deliveryMethod: o.deliveryMethod || "DELIVERY", deliveryAddress: o.deliveryAddress || "" });
  };

  const save = async () => {
    if (!edit) return;
    try {
      await api.put(`/orders/${edit.id}`, form);
      setEdit(null); setMsg("Order updated"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/orders/${id}/status`, { orderStatus: status }); setMsg("Updated"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const doDelete = async () => {
    if (!delId) return;
    try { await api.delete(`/orders/${delId}`); setDelId(null); setMsg("Order deleted and stock restored"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDelId(null); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-4">Order Management</h1>
      <div className="grid grid-cols-1 gap-3">
        {orders.map((o) => (
          <Card key={o.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-navy break-words">{o.orderNumber} - {o.customerName || "Walk-in"}</div>
                <div className="text-sm text-gray-600">Total: ₱{Number(o.totalAmount).toFixed(2)} | {o.transactionSource}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge>{o.orderStatus}</Badge>
                <Badge color={paymentStatusColor[o.paymentStatus] || "gray"}>{o.paymentStatus}</Badge>
                <select className="border rounded p-1 text-sm" value={o.orderStatus} onChange={(e) => updateStatus(o.id, e.target.value)}>
                  {["PENDING","CONFIRMED","PROCESSING","READY_FOR_PICKUP","COMPLETED","CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button variant="secondary" onClick={() => openDetail(o.id)}>Details</Button>
                <Button variant="secondary" onClick={() => openEdit(o)}>Edit</Button>
                <Button variant="danger" onClick={() => setDelId(o.id)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
        {!orders.length && <Card className="p-6 text-center text-slate-500">No orders yet.</Card>}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Order Details" size="max-w-2xl">
        {detail && (
          <div className="space-y-2 text-sm">
            <div><b>Order:</b> {detail.orderNumber}</div>
            <div><b>Customer:</b> {detail.customerName || "Walk-in"}</div>
            <div><b>Status:</b> {detail.orderStatus}</div>
            <div><b>Payment:</b> {detail.paymentStatus}</div>
            <div><b>Total:</b> ₱{Number(detail.totalAmount).toFixed(2)}</div>
            <div><b>Items:</b></div>
            <ul className="list-disc pl-5">{detail.items?.map((it: any) => <li key={it.id}>{it.productId} x{it.quantity} = ₱{Number(it.subtotal).toFixed(2)}</li>)}</ul>
          </div>
        )}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit Order">
        <Input label="Customer Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        <Select label="Delivery Method" value={form.deliveryMethod} onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}>
          <option value="DELIVERY">DELIVERY</option>
          <option value="PICKUP">PICKUP</option>
        </Select>
        <Input label="Delivery Address" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
          <Button onClick={() => setConfirmSave(true)}>Save Changes</Button>
        </div>
      </Modal>

      <ConfirmDialog open={confirmSave} onClose={() => setConfirmSave(false)} onConfirm={() => { setConfirmSave(false); save(); }} title="Confirm Update" message="Save changes to this order?" />

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Delete Order" message="Delete this order? Stock will be restored and linked invoices/payments removed." />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};
