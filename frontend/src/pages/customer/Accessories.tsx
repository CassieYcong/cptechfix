import React from "react";
import api from "../../lib/axios";
import { Card, Button, Input, Badge } from "../../components/ui";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../components/context/CartContext";
import { Modal, SuccessModal, ErrorModal, LoginRequiredModal } from "../../components/ui/Modal";
import { useAuth } from "../../components/context/AuthContext";
import { ShoppingBag, Package, Plus, Minus, Star } from "lucide-react";

const fallbackImgs = [
  "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80",
];

export const Accessories: React.FC = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { refresh } = useCart();
  const [loginModal, setLoginModal] = React.useState(false);
  const [products, setProducts] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sort, setSort] = React.useState("newest");
  const [selected, setSelected] = React.useState<any>(null);
  const [qty, setQty] = React.useState(1);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const load = async () => { const r = await api.get("/products"); setProducts((r.data || []).filter((p: any) => p.isActive !== false)); };
  React.useEffect(() => { load(); }, []);

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const filtered = products
    .filter((p) => p.productName.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !category || p.category === category)
    .sort((a, b) => {
      if (sort === "price_asc") return Number(a.sellingPrice) - Number(b.sellingPrice);
      if (sort === "price_desc") return Number(b.sellingPrice) - Number(a.sellingPrice);
      if (sort === "popular") return (b.sold || 0) - (a.sold || 0);
      return 0;
    });

  const buy = async () => {
    if (!selected) return;
    try {
      const r = await api.post("/orders", { items: [{ productId: selected.id, quantity: qty }] });
      setMsg("Order created: " + r.data.order.orderNumber);
      setSelected(null);
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Accessories</h1>
        <p className="text-slate-500 text-sm mt-1">Quality gear for your setup</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((p, i) => (
          <Card key={p.id} className="overflow-hidden card-hover group">
            <div className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => nav(`/product/${p.id}`)}>
              <img src={p.imageUrl || fallbackImgs[i % fallbackImgs.length]} alt={p.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {p.stock <= p.minimumStock && p.stock > 0 && <div className="absolute top-2 right-2"><Badge color="red">Low Stock</Badge></div>}
              {p.stock === 0 && <div className="absolute top-2 right-2"><Badge color="gray">Out of Stock</Badge></div>}
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{p.category}</div>
              <div className="font-bold text-navy mb-1 break-words cursor-pointer hover:text-brandgreen" onClick={() => nav(`/product/${p.id}`)}>{p.productName}</div>
              <div className="flex items-center gap-1 text-amber-500 mb-1">
                {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={12} fill={j < Math.round(Number(p.rating)) ? "currentColor" : "none"} />)}
                <span className="text-xs text-slate-400 ml-1">{Number(p.rating).toFixed(1)}</span>
              </div>
              <div className="text-lg font-extrabold text-brandgreen">₱{Number(p.sellingPrice).toFixed(2)}</div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <span className="text-xs text-slate-500 flex items-center gap-1 min-w-0"><Package size={12} /> {p.stock} in stock · {p.sold || 0} sold</span>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="secondary" onClick={async () => { if (!user) { setLoginModal(true); return; } try { await api.post("/cart", { productId: p.id, quantity: 1 }); await refresh(); setMsg("Added to cart"); } catch (e: any) { if (e.response?.status === 401) { setLoginModal(true); return; } setErr(e.response?.data?.message || "Failed"); } }}>+Cart</Button>
                  <Button size="sm" onClick={() => nav(`/product/${p.id}`)}>View</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Product Details" size="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <div className="h-48 rounded-xl overflow-hidden bg-slate-100">
              <img src={selected.imageUrl || fallbackImgs[0]} alt={selected.productName} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">{selected.category}</div>
              <div className="text-xl font-bold text-navy">{selected.productName}</div>
              <div className="text-slate-600 text-sm mt-1">{selected.description}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-extrabold text-brandgreen">₱{Number(selected.sellingPrice).toFixed(2)}</div>
              <div className="text-sm text-slate-500">Stock: {selected.stock}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus size={14} /></button>
              <input
                inputMode="numeric"
                value={qty}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setQty(v === "" ? "" as any : Number(v)); }}
                onFocus={(e) => { if (String(e.currentTarget.value) === "1") setQty("" as any); }}
                onBlur={() => { if ((qty as any) === "" || qty === undefined || qty === null) setQty(1); else setQty(Math.max(1, Math.min(selected.stock, Number(qty)))); }}
                className="w-16 text-center border border-slate-200 rounded-lg py-1.5"
              />
              <button onClick={() => setQty(Math.min(selected.stock, qty + 1))} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus size={14} /></button>
              <Button className="w-full sm:flex-1" onClick={buy}>Create Order (₱{(Number(selected.sellingPrice) * qty).toFixed(2)})</Button>
            </div>
          </div>
        )}
      </Modal>
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
      <LoginRequiredModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
};
