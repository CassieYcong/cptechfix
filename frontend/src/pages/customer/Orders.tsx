import React from "react";
import api from "../../lib/axios";
import { useCart } from "../../components/context/CartContext";
import { Card, Button, Badge } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";
import { PaymentModal } from "../../components/ui/PaymentModal";
import { Package, Eye, XCircle, Calendar, CreditCard, ShoppingCart } from "lucide-react";

const orderStatusColor: Record<string,string> = { PENDING: "yellow", CONFIRMED: "blue", PROCESSING: "blue", READY_FOR_PICKUP: "blue", COMPLETED: "green", CANCELLED: "red" };
const paymentStatusColor: Record<string,string> = { UNPAID: "red", PENDING: "yellow", PROCESSING: "blue", PARTIALLY_PAID: "yellow", PAID: "green", FAILED: "red", EXPIRED: "gray", REFUNDED: "purple", PARTIALLY_REFUNDED: "purple" };

export const CustomerOrders: React.FC = () => {
  const { refresh } = useCart();
  const [orders, setOrders] = React.useState<any[]>([]);
  const [detail, setDetail] = React.useState<any>(null);
  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [delId, setDelId] = React.useState<string | null>(null);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payLoading, setPayLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const load = async () => { const r = await api.get("/orders"); setOrders(r.data); };
  React.useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => { const r = await api.get(`/orders/${id}`); setDetail(r.data); };
  const payNow = async (method: string) => {
    if (!detail) return;
    setPayLoading(true);
    try {
      const r = await api.post("/payments/checkout", { orderId: detail.id, amount: Number(detail.totalAmount), paymentMethod: method });
      setPayOpen(false);
      if (r.data.checkoutUrl) window.location.href = r.data.checkoutUrl.startsWith("http") ? r.data.checkoutUrl : window.location.origin + r.data.checkoutUrl;
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
    finally { setPayLoading(false); }
  };
  const cancel = async () => {
    if (!cancelId) return;
    try { await api.post(`/orders/${cancelId}/cancel`); setCancelId(null); setMsg("Order cancelled"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); setCancelId(null); }
  };
  const reorder = async (o: any) => {
    try {
      const r = await api.get(`/orders/${o.id}`);
      const its = r.data.items || [];
      for (const it of its) {
        await api.post("/cart", { productId: it.productId, quantity: it.quantity });
      }
      await refresh();
      setMsg("Items added to cart");
      window.location.href = "/cart";
    } catch (e: any) { setErr(e.response?.data?.message || "Failed to reorder"); }
  };
  const doDelete = async () => {
    if (!delId) return;
    try { await api.delete(`/orders/${delId}`); setDelId(null); setMsg("Order deleted"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDelId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">My Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Track and manage your purchases</p>
      </div>
      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 mb-4">No orders yet.</p>
          <Button onClick={() => window.location.href = "/accessories"}>Shop Accessories</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((o) => (
            <Card key={o.id} className="p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-brandgreen/10 text-brandgreen flex items-center justify-center shrink-0"><Package size={22} /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-navy">{o.orderNumber}</span>
                      <Badge color={orderStatusColor[o.orderStatus] || "gray"}>{o.orderStatus}</Badge>
                      <Badge color={paymentStatusColor[o.paymentStatus] || "gray"}>{o.paymentStatus}</Badge>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Total: ₱{Number(o.totalAmount).toFixed(2)}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(o.createdAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><CreditCard size={12} /> {o.transactionSource}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openDetail(o.id)}><Eye size={14} /> Details</Button>
                  {o.orderStatus !== "COMPLETED" && o.orderStatus !== "CANCELLED" && <Button variant="danger" size="sm" onClick={() => setCancelId(o.id)}><XCircle size={14} /> Cancel</Button>}
  <Button variant="secondary" size="sm" onClick={() => reorder(o)}><ShoppingCart size={14} /> Reorder</Button>
                  {(o.orderStatus === "PENDING" || o.orderStatus === "CANCELLED") && <Button variant="ghost" size="sm" onClick={() => setDelId(o.id)}>Delete</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Order Details" size="max-w-2xl">
        {detail && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Order</div><div className="font-semibold text-navy">{detail.orderNumber}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Status</div><div className="font-semibold"><Badge color={orderStatusColor[detail.orderStatus]}>{detail.orderStatus}</Badge></div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Payment</div><div className="font-semibold"><Badge color={detail.paymentStatus === "PAID" ? "green" : "yellow"}>{detail.paymentStatus}</Badge></div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Total</div><div className="font-semibold text-navy">₱{Number(detail.totalAmount).toFixed(2)}</div></div>
            </div>
            {detail.paymentStatus !== "PAID" && (
              <div className="pt-3">
                <Button onClick={() => setPayOpen(true)}>Pay Now (Online Gateway)</Button>
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500 text-xs mb-2">Items</div>
              <ul className="space-y-1">
                {detail.items?.map((it: any) => (
                  <li key={it.id} className="flex justify-between text-sm"><span className="text-slate-700">{it.productName || it.productId?.slice(0,8)} × {it.quantity}</span><span className="font-semibold text-navy">₱{Number(it.subtotal).toFixed(2)}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} onPay={payNow} amount={detail ? Number(detail.totalAmount) : 0} loading={payLoading} />
      <ConfirmDialog open={!!cancelId} onClose={() => setCancelId(null)} onConfirm={cancel} title="Cancel Order" message="Cancel this order? Stock will be restored." />
      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Delete Order" message="Delete this order permanently? Stock will be restored." />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};
