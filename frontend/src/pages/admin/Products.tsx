import React from "react";
import api from "../../lib/axios";
import { Card, Button, Badge, NumberInput } from "../../components/ui";
import { Package, Search, Filter, Eye, Pencil, Trash2, Plus, Minus } from "lucide-react";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [movements, setMovements] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<any>(null);
  const [adjust, setAdjust] = React.useState<any>(null);
  const [delId, setDelId] = React.useState<string | null>(null);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [form, setForm] = React.useState({ sku: "", productName: "", description: "", category: "", brand: "Generic", supplier: "", costPrice: "", sellingPrice: "", stock: "", minimumStock: "", imageUrl: "", isActive: true });
  const [saving, setSaving] = React.useState(false);
  const [adj, setAdj] = React.useState({ quantity: "", movementType: "STOCK_IN", remarks: "" });
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const [q, setQ] = React.useState("");
  const [catFilter, setCatFilter] = React.useState("");
  const [brandFilter, setBrandFilter] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const load = async () => {
    try {
      const r = await api.get("/products");
      setProducts(r.data);
      const m = await api.get("/products/movements").catch(() => ({ data: [] }));
      setMovements(m.data || []);
    } catch {}
  };
  React.useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ sku: "", productName: "", description: "", category: "", brand: "Generic", supplier: "", costPrice: "", sellingPrice: "", stock: "", minimumStock: "", imageUrl: "", isActive: true });

  const openEdit = (p: any) => {
    setEdit(p);
    setForm({
      sku: p.sku || "",
      productName: p.productName || "",
      description: p.description || "",
      category: p.category || "",
      brand: p.brand || "Generic",
      supplier: p.supplier || "",
      costPrice: p.costPrice !== undefined && p.costPrice !== null ? String(p.costPrice) : "",
      sellingPrice: p.sellingPrice !== undefined && p.sellingPrice !== null ? String(p.sellingPrice) : "",
      stock: p.stock !== undefined && p.stock !== null ? String(p.stock) : "",
      minimumStock: p.minimumStock !== undefined && p.minimumStock !== null ? String(p.minimumStock) : "5",
      imageUrl: p.imageUrl || "",
      isActive: p.isActive !== false,
    });
    setOpen(true);
  };

  const save = async () => {
    if (saving) return;
    const payload = {
      sku: form.sku.trim(),
      productName: form.productName.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      brand: form.brand.trim() || "Generic",
      supplier: form.supplier.trim() || undefined,
      costPrice: form.costPrice.trim() === "" ? 0 : Number(form.costPrice),
      sellingPrice: form.sellingPrice.trim() === "" ? NaN : Number(form.sellingPrice),
      stock: form.stock.trim() === "" ? 0 : Number(form.stock),
      minimumStock: form.minimumStock.trim() === "" ? 0 : Number(form.minimumStock),
      imageUrl: form.imageUrl.trim() || undefined,
      isActive: form.isActive,
    };
    if (!payload.sku) { setErr("SKU is required."); return; }
    if (!payload.productName) { setErr("Product name is required."); return; }
    if (Number.isNaN(payload.sellingPrice) || payload.sellingPrice < 0) { setErr("Selling price must be a valid number."); return; }
    if (Number.isNaN(payload.costPrice) || payload.costPrice < 0) { setErr("Cost price must be a valid number."); return; }
    if (!Number.isInteger(payload.stock) || payload.stock < 0) { setErr("Stock must be a whole number (0 or higher)."); return; }
    if (!Number.isInteger(payload.minimumStock) || payload.minimumStock < 0) { setErr("Minimum stock must be a whole number (0 or higher)."); return; }
    setSaving(true);
    try {
      if (edit) await api.put(`/products/${edit.id}`, payload);
      else await api.post("/products", payload);
      setOpen(false); setEdit(null); resetForm(); setMsg("Product saved successfully"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed to save product"); }
    finally { setSaving(false); }
  };

  const doAdjust = async () => {
    if (!adjust) return;
    try {
      await api.post("/products/adjustments", { productId: adjust.id, quantity: Number(adj.quantity), movementType: adj.movementType, remarks: adj.remarks });
      setAdjust(null); setMsg("Stock updated"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const doDelete = async () => {
    if (!delId) return;
    try {
      const r = await api.delete(`/products/${delId}`);
      setDelId(null); setMsg(r.data?.message || "Deleted"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDelId(null); }
  };

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  const filtered = products.filter((p) => {
    if (q && !(p.productName?.toLowerCase().includes(q.toLowerCase()) || p.sku?.toLowerCase().includes(q.toLowerCase()))) return false;
    if (catFilter && p.category !== catFilter) return false;
    if (brandFilter && p.brand !== brandFilter) return false;
    if (stockFilter === "low" && !(p.stock <= p.minimumStock && p.stock > 0)) return false;
    if (stockFilter === "out" && p.stock !== 0) return false;
    if (stockFilter === "in" && !(p.stock > p.minimumStock)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalProducts = products.length;
  const totalCategories = categories.length;
  const inventoryValue = products.reduce((a, p) => a + Number(p.costPrice || 0) * (p.stock || 0), 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minimumStock).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const activeProducts = products.filter((p) => p.isActive !== false).length;

  const statusOf = (p: any) => p.isActive === false ? "Inactive" : p.stock === 0 ? "Out of Stock" : p.stock <= p.minimumStock ? "Low Stock" : "In Stock";
  const statusColor = (s: string) => s === "In Stock" ? "green" : s === "Low Stock" ? "yellow" : s === "Out of Stock" ? "red" : "gray";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">Products & Inventory</h1>
        <Button onClick={() => { resetForm(); setEdit(null); setErr(""); setOpen(true); }}><Plus size={16} /> Add Product</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card className="p-4"><div className="text-xs text-slate-500">Total Products</div><div className="text-2xl font-bold text-navy">{totalProducts}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Categories</div><div className="text-2xl font-bold text-navy">{totalCategories}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Inventory Value</div><div className="text-lg font-bold text-navy">₱{inventoryValue.toFixed(2)}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Low Stock</div><div className="text-2xl font-bold text-amber-600">{lowStock}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Out of Stock</div><div className="text-2xl font-bold text-red-600">{outOfStock}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Active</div><div className="text-2xl font-bold text-emerald-600">{activeProducts}</div></Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name or SKU" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

        </div>
      </Card>

      {/* Product table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Selling</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3"><div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">{p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={14} /></div>}</div></td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-navy break-words max-w-[180px]">{p.productName}</td>
                  <td className="px-4 py-3 text-slate-600">{p.category || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.brand || "—"}</td>
                  <td className="px-4 py-3">₱{Number(p.costPrice).toFixed(2)}</td>
                  <td className="px-4 py-3">₱{Number(p.sellingPrice).toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold">{p.stock}</td>
                  <td className="px-4 py-3">{p.minimumStock}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(statusOf(p))}>{statusOf(p)}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setView(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Eye size={14} /></button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil size={14} /></button>
                      <button onClick={() => setAdjust(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Package size={14} /></button>
                      <button onClick={() => setDelId(p.id)} className="p-1.5 rounded hover:bg-slate-100 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-slate-100 text-sm">
          <span className="text-slate-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </Card>

      {/* Add/Edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Edit Product" : "Add Product"} size="max-w-2xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU <span className="text-red-500">*</span></label>
          <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. SKU-001" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
          <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Samsung 500GB SSD" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Storage Devices" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
            <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Samsung" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier</label>
            <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
          </div>
          <NumberInput label="Cost Price (₱)" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          <NumberInput label="Selling Price (₱) *" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          <NumberInput label={edit ? "Stock" : "Initial Stock"} integer value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <NumberInput label="Minimum Stock" integer value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <textarea className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Image URL</label>
          <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          {form.imageUrl.trim() && <img src={form.imageUrl} alt="preview" className="mt-2 h-20 w-20 object-cover rounded-lg border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        </div>
        <label className="flex items-center gap-2 text-sm mb-4 text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active product</label>
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={saving} onClick={() => setConfirmSave(true)}>{saving ? "Saving..." : "Save Product"}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={confirmSave} onClose={() => setConfirmSave(false)} onConfirm={() => { setConfirmSave(false); save(); }} title="Confirm Save" message={edit ? "Save changes to this product?" : "Create this new product?"} />
      {/* View details modal */}
      <Modal open={!!view} onClose={() => setView(null)} title="Product Details" size="max-w-2xl">
        {view && (
          <div className="space-y-3 text-sm">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                {view.imageUrl ? <img src={view.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={24} /></div>}
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-bold text-navy text-lg">{view.productName}</div>
                <div className="text-slate-500">SKU: {view.sku}</div>
                <div><Badge color={statusColor(statusOf(view))}>{statusOf(view)}</Badge></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Category</div><div className="font-semibold">{view.category || "—"}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Brand</div><div className="font-semibold">{view.brand || "—"}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Cost Price</div><div className="font-semibold">₱{Number(view.costPrice).toFixed(2)}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Selling Price</div><div className="font-semibold">₱{Number(view.sellingPrice).toFixed(2)}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Stock</div><div className="font-semibold">{view.stock}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Min Stock</div><div className="font-semibold">{view.minimumStock}</div></div>
            </div>
            {view.description && <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs mb-1">Description</div><div>{view.description}</div></div>}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500 text-xs mb-2">Recent Stock Movements</div>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {movements.filter((m) => m.productId === view.id).slice(-8).reverse().map((m) => (
                  <li key={m.id} className="flex justify-between text-xs">
                    <span>{m.movementType} · {m.quantity}</span>
                    <span className="text-slate-500">{new Date(m.createdAt).toLocaleString()}</span>
                  </li>
                ))}
                {movements.filter((m) => m.productId === view.id).length === 0 && <li className="text-slate-400">No movements yet.</li>}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Stock adjustment modal */}
      <Modal open={!!adjust} onClose={() => setAdjust(null)} title="Stock Adjustment">
        {adjust && (
          <div className="space-y-3">
            <div className="font-semibold">{adjust.productName} (current {adjust.stock})</div>
            <select className="w-full border rounded p-2" value={adj.movementType} onChange={(e) => setAdj({ ...adj, movementType: e.target.value })}>
              {["STOCK_IN", "STOCK_OUT", "DAMAGED", "ADJUSTMENT", "RETURN"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <NumberInput label="Quantity" integer value={adj.quantity} onChange={(e) => setAdj({ ...adj, quantity: e.target.value })} />
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks</label>
              <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" value={adj.remarks} onChange={(e) => setAdj({ ...adj, remarks: e.target.value })} placeholder="Reason" />
            </div>
            <Button onClick={doAdjust}>Apply</Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Delete Product" message="Delete this product? If it has order history it will be deactivated instead." />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};