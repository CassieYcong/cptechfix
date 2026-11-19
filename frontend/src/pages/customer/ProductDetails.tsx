import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { useCart } from "../../components/context/CartContext";
import { Card, Button, Badge } from "../../components/ui";
import { LoginRequiredModal } from "../../components/ui/Modal";
import { useAuth } from "../../components/context/AuthContext";
import { ShoppingBag, ShoppingCart, Zap, Star, Package, CheckCircle2 } from "lucide-react";

const fallbackImgs = [
  "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
];

export const ProductDetails: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { refresh } = useCart();
  const [loginModal, setLoginModal] = React.useState(false);
  const [product, setProduct] = React.useState<any>(null);
  const [qty, setQty] = React.useState(1);
  const [imgIdx, setImgIdx] = React.useState(0);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    (async () => { try { const r = await api.get(`/products/${id}`); setProduct(r.data); } catch {} })();
  }, [id]);

  if (!product) return <div className="p-6 text-slate-500">Loading...</div>;

  const images = product.images ? product.images.split(",").map((s: string) => s.trim()).filter(Boolean) : (product.imageUrl ? [product.imageUrl] : fallbackImgs);
  const inStock = product.stock > 0;

  const addToCart = async () => {
    if (!user) { setLoginModal(true); return; }
    try {
      await api.post("/cart", { productId: product.id, quantity: qty });
      await refresh();
      setMsg("Added to cart");
    } catch (e: any) {
      if (e.response?.status === 401) { setLoginModal(true); return; }
      setMsg(e.response?.data?.message || "Failed");
    }
  };

  const buyNow = async () => {
    if (!user) { setLoginModal(true); return; }
    try {
      await api.post("/cart", { productId: product.id, quantity: qty });
      await refresh();
      nav("/cart");
    } catch (e: any) {
      if (e.response?.status === 401) { setLoginModal(true); return; }
      setMsg(e.response?.data?.message || "Failed");
    }
  };

  return (
    <> 
    <div className="space-y-6">
      <button onClick={() => nav(-1)} className="text-navy text-sm font-medium hover:underline">← Back</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 mb-3">
            <img src={images[imgIdx] || fallbackImgs[0]} alt={product.productName} className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === imgIdx ? "border-navy" : "border-transparent"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide">{product.category}</div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy">{product.productName}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill={i < Math.round(Number(product.rating)) ? "currentColor" : "none"} />)}
            </div>
            <span className="text-sm text-slate-500">{Number(product.rating).toFixed(1)} · {product.sold} sold</span>
          </div>
          <div className="text-3xl font-extrabold text-brandgreen">₱{Number(product.sellingPrice).toFixed(2)}</div>
          <div className="text-sm text-slate-600">{product.description}</div>
          {product.specifications && (
            <Card className="p-4">
              <div className="font-semibold text-navy mb-2">Specifications</div>
              <div className="text-sm text-slate-600 whitespace-pre-line">{product.specifications}</div>
            </Card>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Package size={16} className="text-slate-400" />
            <span className={inStock ? "text-brandgreen font-medium" : "text-red-600 font-medium"}>
              {inStock ? `${product.stock} in stock` : "Out of stock"}
            </span>
          </div>
          {inStock && (
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-slate-50">−</button>
                <input inputMode="numeric" value={qty} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setQty(v === "" ? "" as any : Math.max(1, Math.min(product.stock, Number(v)))); }} onFocus={(e) => { if (String(e.currentTarget.value) === "1") setQty("" as any); }} onBlur={() => { if ((qty as any) === "" || qty === undefined || qty === null) setQty(1); }} className="w-14 text-center border-x border-slate-200 py-2" />
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 py-2 hover:bg-slate-50">+</button>
              </div>
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            <Button variant="secondary" onClick={addToCart} disabled={!inStock}><ShoppingCart size={16} /> Add to Cart</Button>
            <Button onClick={buyNow} disabled={!inStock}><Zap size={16} /> Buy Now</Button>
          </div>
          {msg && <p className="text-sm text-brandgreen font-medium flex items-center gap-1"><CheckCircle2 size={14} /> {msg}</p>}
        </div>
      </div>
    </div>
    <LoginRequiredModal open={loginModal} onClose={() => setLoginModal(false)} />
    </>
  );
};
