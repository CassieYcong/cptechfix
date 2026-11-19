import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { useCart } from "../../components/context/CartContext";
import { Card, Button } from "../../components/ui";
import { Trash2, ShoppingCart, Minus, Plus } from "lucide-react";

export const Cart: React.FC = () => {
  const nav = useNavigate();
  const { refresh } = useCart();
  const [items, setItems] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/cart");
      setItems(r.data);
      setSelected(new Set(r.data.map((i: any) => i.id)));
    } catch {}
    setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const updateQty = async (id: string, q: number) => {
    await api.put(`/cart/${id}`, { quantity: q });
    load();
    refresh();
  };
  const remove = async (id: string) => {
    await api.delete(`/cart/${id}`);
    load();
    refresh();
  };

  const selectedItems = items.filter((i) => selected.has(i.id));
  const subtotal = selectedItems.reduce((a, i) => a + Number(i.product?.sellingPrice || 0) * i.quantity, 0);
  const total = subtotal; // voucher applied at checkout

  const checkout = () => {
    if (selectedItems.length === 0) return;
    // store selected ids in sessionStorage for checkout
    sessionStorage.setItem("checkout_items", JSON.stringify(selectedItems.map((i) => ({ productId: i.productId, quantity: i.quantity }))));
    nav("/checkout");
  };

  if (loading) return <div className="p-6 text-slate-500">Loading cart...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Shopping Cart</h1>
        <span className="text-slate-500 text-sm">{items.length} item(s)</span>
      </div>
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 mb-4">Your cart is empty.</p>
          <Button onClick={() => nav("/accessories")}>Shop Now</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <Card className="p-4 flex items-center gap-3">
              <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} className="w-4 h-4" />
              <span className="font-medium text-navy">Select All ({items.length})</span>
            </Card>
            {items.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="w-4 h-4 shrink-0" />
                  <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    <img src={i.product?.imageUrl || "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=200&q=80"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-navy break-words">{i.product?.productName}</div>
                    <div className="text-sm text-brandgreen font-semibold">₱{Number(i.product?.sellingPrice).toFixed(2)}</div>
                     <div className="text-xs text-slate-500">Stock: {i.product?.stock ?? 0}</div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <button onClick={() => updateQty(i.id, Math.max(1, i.quantity - 1))} className="px-2 py-1 hover:bg-slate-50"><Minus size={12} /></button>
                      <span className="px-3 py-1 text-sm">{i.quantity}</span>
                      <button onClick={() => updateQty(i.id, i.quantity + 1)} disabled={i.quantity >= (i.product?.stock ?? 0)} className="px-2 py-1 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={12} /></button>
                    </div>
                    <div className="text-sm font-semibold text-navy w-20 text-right">₱{(Number(i.product?.sellingPrice) * i.quantity).toFixed(2)}</div>
                    <button onClick={() => remove(i.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div>
            <Card className="p-5 sticky top-20">
              <h3 className="font-bold text-navy mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal ({selectedItems.length} items)</span><span className="font-semibold">₱{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className="font-semibold text-brandgreen">Free</span></div>
                <div className="border-t pt-2 flex justify-between text-base"><span className="font-bold text-navy">Total</span><span className="font-extrabold text-brandgreen">₱{total.toFixed(2)}</span></div>
              </div>
              <Button className="w-full" size="lg" onClick={checkout} disabled={selectedItems.length === 0}>Checkout ({selectedItems.length})</Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
