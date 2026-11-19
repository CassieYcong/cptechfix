import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { useCart } from "../../components/context/CartContext";
import { Card, Button, Input } from "../../components/ui";
import { ShoppingBag, MapPin, Truck, Store } from "lucide-react";
import { PAYMENT_METHODS } from "../../components/ui/PaymentModal";
import { CUSTOMER_INFO_ICONS } from "../../constants/customerInformationIcons";

const VOUCHERS: Record<string, number> = { "TECHFIX10": 0.10, "SAVE50": 50 };

export const Checkout: React.FC = () => {
  const nav = useNavigate();
  const { refresh } = useCart();
  const [items, setItems] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<Record<string, any>>({});
  const [customerName, setCustomerName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [method, setMethod] = React.useState("DELIVERY");
  const [payment, setPayment] = React.useState("GCash");
  const [voucher, setVoucher] = React.useState("");
  const [appliedVoucher, setAppliedVoucher] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const DELIVERY_FEE = method === "DELIVERY" ? 99 : 0;

  React.useEffect(() => {
    (async () => {
      const raw = sessionStorage.getItem("checkout_items");
      const sel = raw ? JSON.parse(raw) : [];
      setItems(sel);
      // fetch product details
      const prods: Record<string, any> = {};
      for (const it of sel) {
        try { const r = await api.get(`/products/${it.productId}`); prods[it.productId] = r.data; } catch {}
      }
      setProducts(prods);
    })();
  }, []);

  const subtotal = items.reduce((a, i) => a + Number(products[i.productId]?.sellingPrice || 0) * i.quantity, 0);
  const discount = appliedVoucher ? (VOUCHERS[appliedVoucher] < 1 ? subtotal * VOUCHERS[appliedVoucher] : VOUCHERS[appliedVoucher]) : 0;
  const total = Math.max(0, subtotal - discount + DELIVERY_FEE);

  const applyVoucher = () => {
    if (VOUCHERS[voucher.toUpperCase()]) {
      setAppliedVoucher(voucher.toUpperCase());
    } else {
      setErr("Invalid voucher code");
    }
  };

  const placeOrder = async () => {
    if (!customerName.trim()) { setErr("Customer name is required"); return; }
    if (method === "DELIVERY" && !address.trim()) { setErr("Delivery address required"); return; }
    setLoading(true); setErr("");
    try {
      const r = await api.post("/orders", {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        transactionSource: "ONLINE",
        customerName: customerName.trim(),
        contactNumber: phone.trim() || undefined,
        paymentMethod: payment,
        amountPaid: 0,
        discount,
        voucherCode: appliedVoucher || undefined,
        deliveryMethod: method,
        deliveryAddress: method === "DELIVERY" ? address : undefined,
      });
      // clear cart
      await api.delete("/cart").catch(() => {});
      await refresh();
      sessionStorage.removeItem("checkout_items");
      // go to payment
      const checkout = await api.post("/payments/checkout", { orderId: r.data.order.id, amount: total, paymentMethod: payment });
      if (checkout.data.checkoutUrl) {
        window.location.href = checkout.data.checkoutUrl.startsWith("http") ? checkout.data.checkoutUrl : window.location.origin + checkout.data.checkoutUrl;
      } else {
        nav("/orders");
      }
    } catch (e: any) {
      setErr(e.response?.data?.message || "Order failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-navy">Checkout</h1>
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBag size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No items to checkout.</p>
          <Button className="mt-4" onClick={() => nav("/cart")}>Back to Cart</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-navy mb-3 flex items-center gap-2">{CUSTOMER_INFO_ICONS["customer-contact"]} Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Full Name" icon={CUSTOMER_INFO_ICONS["customer-name"]} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Juan Dela Cruz" />
                <Input label="Contact Number" icon={CUSTOMER_INFO_ICONS["customer-phone"]} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XXXXXXXXX" />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-bold text-navy mb-3 flex items-center gap-2"><MapPin size={18} /> Delivery</h3>
              <div className="flex gap-3 mb-3">
                <button onClick={() => setMethod("DELIVERY")} className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${method === "DELIVERY" ? "border-navy bg-navy/5" : "border-slate-200"}`}><Truck size={18} /> Delivery</button>
                <button onClick={() => setMethod("PICKUP")} className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${method === "PICKUP" ? "border-navy bg-navy/5" : "border-slate-200"}`}><Store size={18} /> Store Pickup</button>
              </div>
              {method === "DELIVERY" && <Input label="Delivery Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Province" />}
            </Card>
            <Card className="p-5">
              <h3 className="font-bold text-navy mb-3">Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayment(m.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${payment === m.id ? "border-brandgreen bg-brandgreen/5" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div className="w-12 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {m.logo ? <img src={m.logo} alt={m.label} className="w-full h-full object-contain" /> : <div className={`w-full h-full bg-gradient-to-br ${m.color} text-white flex items-center justify-center`}>{m.icon}</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-navy text-sm">{m.label}</div>
                      <div className="text-xs text-slate-500 truncate">{m.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-bold text-navy mb-3">Voucher / Discount</h3>
              <div className="flex gap-2">
                <input value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder="Enter voucher code" className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" />
                <Button variant="secondary" onClick={applyVoucher}>Apply</Button>
              </div>
              {appliedVoucher && <p className="text-brandgreen text-sm mt-2">Applied {appliedVoucher}: -₱{discount.toFixed(2)}</p>}
            </Card>
          </div>
          <div>
            <Card className="p-5 sticky top-20">
              <h3 className="font-bold text-navy mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm mb-4">
                {items.map((i) => (
                  <div key={i.productId} className="flex justify-between gap-2">
                    <span className="text-slate-600 break-words min-w-0">{products[i.productId]?.productName} × {i.quantity}</span>
                    <span className="font-medium shrink-0">₱{(Number(products[i.productId]?.sellingPrice || 0) * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between"><span className="text-slate-500">Subtotal</span><span>₱{subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-brandgreen"><span>Discount</span><span>-₱{discount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Delivery Fee</span><span>₱{DELIVERY_FEE.toFixed(2)}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-semibold text-navy flex items-center gap-2">
                    {(() => {
                      const m = PAYMENT_METHODS.find((x) => x.id === payment);
                      if (!m) return "Not selected";
                      return (<>{m.logo ? <img src={m.logo} alt={m.label} className="w-5 h-4 object-contain" /> : m.icon}<span>{m.label}</span></>);
                    })()}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between text-base"><span className="font-bold text-navy">Total</span><span className="font-extrabold text-brandgreen">₱{total.toFixed(2)}</span></div>
              </div>
              {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
              <Button className="w-full" size="lg" onClick={placeOrder} disabled={loading}>{loading ? "Placing order..." : "Place Order"}</Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
