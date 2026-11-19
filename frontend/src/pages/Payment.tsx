import React from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import api from "../lib/axios";
import { Card, Button } from "../components/ui";
import { SuccessModal, ErrorModal } from "../components/ui/Modal";
import { CheckCircle2, Package, CreditCard, Truck, MapPin, ShoppingBag } from "lucide-react";

export const PaymentSuccess: React.FC = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const paymentId = params.get("payment_id");
  const [payment, setPayment] = React.useState<any>(null);
  const [order, setOrder] = React.useState<any>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      if (!paymentId) { setMsg("Payment successful!"); return; }
      try {
        const p = await api.get(`/payments/verify/${paymentId}`);
        setPayment(p.data);
        if (p.data?.orderId) {
          try { const o = await api.get(`/orders/${p.data.orderId}`); setOrder(o.data); } catch {}
        }
        setMsg("Payment successful! Your receipt has been generated.");
      } catch (e: any) {
        setErr(e.response?.data?.message || "Verification failed");
      }
    })();
  }, [paymentId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="p-8 max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-4xl">✓</div>
        <h2 className="text-2xl font-bold text-navy mb-2">Order Confirmed</h2>
        <p className="text-slate-600 mb-6">{msg || "Processing..."}</p>

        {(order || payment) && (
          <div className="text-left space-y-3 mb-6">
            {order && (
              <>
                <div className="bg-slate-50 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-semibold text-navy">{order.orderNumber}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-slate-500">Payment Status</span>
                  <span className="font-semibold text-emerald-600">{order.paymentStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-slate-500">Total Amount</span>
                  <span className="font-extrabold text-navy">₱{Number(order.totalAmount).toFixed(2)}</span>
                </div>
                {order.deliveryMethod && (
                  <div className="bg-slate-50 rounded-lg p-3 flex justify-between text-sm">
                    <span className="text-slate-500">Fulfillment</span>
                    <span className="font-semibold text-navy">{order.deliveryMethod === "DELIVERY" ? "Delivery" : "Store Pickup"}</span>
                  </div>
                )}
                {order.items?.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-slate-500 text-xs mb-2">Items</div>
                    <ul className="space-y-1">
                      {order.items.map((it: any) => (
                        <li key={it.id} className="flex justify-between text-sm">
                          <span className="text-slate-700 truncate">{it.productName || it.productId?.slice(0, 8)} × {it.quantity}</span>
                          <span className="font-semibold text-navy">₱{Number(it.subtotal).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {payment && !order && (
              <div className="bg-slate-50 rounded-lg p-3 flex justify-between text-sm">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-semibold text-navy">{payment.paymentMethod}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {order && <Button className="flex-1" onClick={() => nav(`/orders`)}>View Order Details</Button>}
          {order && <Button variant="secondary" className="flex-1" onClick={() => nav(`/tracking`)}>Track My Order</Button>}
          <Button variant="secondary" className="flex-1" onClick={() => nav("/accessories")}><ShoppingBag size={16} /> Continue Shopping</Button>
        </div>
      </Card>
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};

export const PaymentCancel: React.FC = () => {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="p-8 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-3xl">✕</div>
        <h2 className="text-2xl font-bold text-navy mb-2">Payment Cancelled</h2>
        <p className="text-slate-600 mb-6">Your payment was cancelled. You can try again anytime.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1" onClick={() => nav("/orders")}>Back to Orders</Button>
          <Button variant="secondary" className="flex-1" onClick={() => nav("/accessories")}>Continue Shopping</Button>
        </div>
      </Card>
    </div>
  );
};

export const PaymentSandbox: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const pay = async () => {
    setLoading(true);
    try {
      await api.post("/payments/webhook", { paymentId: id, status: "success" });
      nav(`/payment/success?payment_id=${id}`);
    } catch {
      nav(`/payment/cancel?payment_id=${id}`);
    } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-navy mb-2">Sandbox Payment</h2>
        <p className="text-slate-600 mb-6">Simulated payment gateway (no real charge).</p>
        <Button onClick={pay} disabled={loading} size="lg" className="w-full">{loading ? "Processing..." : "Simulate Pay"}</Button>
      </Card>
    </div>
  );
};