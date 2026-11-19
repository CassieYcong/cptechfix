import React from "react";
import api from "../../lib/axios";
import { Card, Button, Input, Textarea, Select, Badge } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";
import { Wrench, ShoppingBag, Loader2, RefreshCw } from "lucide-react";

const dateInput = (v: any) => (v ? String(v).slice(0, 10) : "");
const fmtDate = (v: any) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};
const repairDevice = (r: any) => [r.deviceType, r.brand, r.model].filter(Boolean).join(" ") || "—";
const saleProducts = (o: any) => (o.items?.length ? o.items.map((i: any) => i.productName).join(", ") : "—");
const saleQuantity = (o: any) => (o.items?.length ? o.items.reduce((a: number, i: any) => a + Number(i.quantity || 0), 0) : 0);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; hint: string; action?: React.ReactNode }> = ({ icon, title, hint, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div>
    <div>
      <p className="font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
    {action}
  </div>
);

export const Walkins: React.FC = () => {
  const [tx, setTx] = React.useState<any>({ repairs: [], orders: [] });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [custOpen, setCustOpen] = React.useState(false);
  const [repairOpen, setRepairOpen] = React.useState(false);
  const [saleOpen, setSaleOpen] = React.useState(false);
  const [editRepair, setEditRepair] = React.useState<any>(null);
  const [editSale, setEditSale] = React.useState<any>(null);
  const [del, setDel] = React.useState<{ type: "repair" | "sale"; id: string } | null>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const [cust, setCust] = React.useState({ fullName: "", phoneNumber: "", email: "" });
  const [repair, setRepair] = React.useState({ customerName: "", contactNumber: "", deviceType: "", brand: "", model: "", problemDescription: "", repairCost: "", amountPaid: "", serviceType: "", technician: "", expectedCompletionDate: "" });
  const [sale, setSale] = React.useState({ customerName: "", productId: "", quantity: "", paymentMethod: "Cash", amountPaid: "" });
  const [products, setProducts] = React.useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [t, p] = await Promise.all([api.get("/walk-ins/transactions"), api.get("/products")]);
      setTx(t.data && Array.isArray(t.data.repairs) && Array.isArray(t.data.orders) ? t.data : { repairs: [], orders: [] });
      setProducts(p.data || []);
    } catch (e: any) {
      setLoadError(e.response?.data?.message || "Unable to load walk-in records. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { load(); }, []);

  const regCust = async () => {
    try { await api.post("/walk-ins/customers", cust); setCustOpen(false); setCust({ fullName: "", phoneNumber: "", email: "" }); setMsg("Customer registered"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const createRepair = async () => {
    try {
      await api.post("/repairs", { ...repair, transactionSource: "WALK_IN", repairCost: repair.repairCost === "" ? 0 : Number(repair.repairCost), amountPaid: repair.amountPaid === "" ? 0 : Number(repair.amountPaid) });
      setRepairOpen(false); setMsg("Walk-in repair created"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const createSale = async () => {
    try {
      const prod = products.find((p) => p.id === sale.productId);
      const qty = sale.quantity === "" ? 1 : Number(sale.quantity);
      const total = prod ? Number(prod.sellingPrice) * qty : 0;
      await api.post("/orders", { items: [{ productId: sale.productId, quantity: qty }], transactionSource: "WALK_IN", customerName: sale.customerName, paymentMethod: sale.paymentMethod, amountPaid: sale.amountPaid === "" ? total : Number(sale.amountPaid) });
      setSaleOpen(false); setMsg("Walk-in sale created"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const openEditRepair = (r: any) => setEditRepair({
    id: r.id,
    customerName: r.customerName || "",
    contactNumber: r.contactNumber || "",
    deviceType: r.deviceType || "",
    brand: r.brand || "",
    model: r.model || "",
    problemDescription: r.problemDescription || "",
    serviceType: r.serviceType || "",
    technician: r.technician || "",
    expectedCompletionDate: dateInput(r.expectedCompletionDate),
    repairCost: r.repairCost ? String(r.repairCost) : "",
    amountPaid: r.amountPaid ? String(r.amountPaid) : "",
  });

  const saveRepair = async () => {
    if (!editRepair) return;
    try {
      const { id, ...payload } = editRepair;
      await api.put(`/repairs/${id}`, { ...payload, repairCost: payload.repairCost === "" ? 0 : Number(payload.repairCost), amountPaid: payload.amountPaid === "" ? 0 : Number(payload.amountPaid) });
      setEditRepair(null); setMsg("Repair updated"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const openEditSale = (o: any) => setEditSale({
    id: o.id,
    customerName: o.customerName || "",
    deliveryMethod: o.deliveryMethod || "PICKUP",
    deliveryAddress: o.deliveryAddress || "",
  });

  const saveSale = async () => {
    if (!editSale) return;
    try {
      const { id, ...payload } = editSale;
      await api.put(`/orders/${id}`, payload);
      setEditSale(null); setMsg("Sale updated"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const updateRepairStatus = async (id: string, status: string) => {
    try { await api.patch(`/repairs/${id}/status`, { status }); setMsg("Status updated"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const updateSaleStatus = async (id: string, orderStatus: string) => {
    try { await api.patch(`/orders/${id}/status`, { orderStatus }); setMsg("Status updated"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await api.delete(del.type === "repair" ? `/repairs/${del.id}` : `/orders/${del.id}`);
      setDel(null); setMsg(del.type === "repair" ? "Repair deleted" : "Sale deleted and stock restored"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDel(null); }
  };

  const repairs: any[] = tx.repairs || [];
  const orders: any[] = tx.orders || [];

  const loadingBlock = (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin" /> Loading records…
    </div>
  );
  const errorBlock = (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-red-600">{loadError}</p>
      <Button size="sm" variant="secondary" onClick={load}><RefreshCw size={14} /> Retry</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Walk-in Management</h1>
        <p className="mt-1 text-sm text-slate-500">Counter repairs and walk-in sales recorded at the shop.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCustOpen(true)}>Register Customer</Button>
        <Button onClick={() => setRepairOpen(true)}>New Walk-in Repair</Button>
        <Button onClick={() => setSaleOpen(true)}>New Walk-in Sale</Button>
      </div>

      {/* Walk-in Repairs */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
          <div>
            <h2 className="font-semibold text-navy">Walk-in Repairs</h2>
            <p className="text-xs text-slate-500">{repairs.length} record{repairs.length === 1 ? "" : "s"}</p>
          </div>
          <Button size="sm" onClick={() => setRepairOpen(true)}>New Repair</Button>
        </div>

        {loading ? loadingBlock : loadError ? errorBlock : !repairs.length ? (
          <EmptyState
            icon={<Wrench size={22} />}
            title="No walk-in repairs yet"
            hint="Repairs created at the counter will appear here."
            action={<Button size="sm" onClick={() => setRepairOpen(true)}>New Walk-in Repair</Button>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Repair ID</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Device Type</th>
                    <th className="px-4 py-3 font-semibold">Service Requested</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Technician</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repairs.map((r: any) => (
                    <tr key={r.id} className="align-top hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-navy">{r.referenceNumber}</td>
                      <td className="break-words px-4 py-3 text-slate-700">{r.customerName || "Walk-in"}</td>
                      <td className="break-words px-4 py-3 text-slate-700">{repairDevice(r)}</td>
                      <td className="break-words px-4 py-3 text-slate-700">{r.serviceType || r.problemDescription || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge>{r.status}</Badge>
                          <select className="rounded border p-1 text-xs" value={r.status} onChange={(e) => updateRepairStatus(r.id, e.target.value)}>
                            {["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="break-words px-4 py-3 text-slate-700">{r.technician || "Unassigned"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEditRepair(r)}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => setDel({ type: "repair", id: r.id })}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {repairs.map((r: any) => (
                <div key={r.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-navy break-words">{r.referenceNumber}</div>
                      <div className="text-sm text-slate-600 break-words">{r.customerName || "Walk-in"}</div>
                    </div>
                    <Badge>{r.status}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-1 text-sm">
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Device</dt><dd className="min-w-0 break-words text-slate-700">{repairDevice(r)}</dd></div>
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Service</dt><dd className="min-w-0 break-words text-slate-700">{r.serviceType || r.problemDescription || "—"}</dd></div>
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Technician</dt><dd className="min-w-0 break-words text-slate-700">{r.technician || "Unassigned"}</dd></div>
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Date</dt><dd className="text-slate-700">{fmtDate(r.createdAt)}</dd></div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select className="rounded border p-1 text-xs" value={r.status} onChange={(e) => updateRepairStatus(r.id, e.target.value)}>
                      {["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Button size="sm" variant="secondary" onClick={() => openEditRepair(r)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDel({ type: "repair", id: r.id })}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Walk-in Sales */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
          <div>
            <h2 className="font-semibold text-navy">Walk-in Sales</h2>
            <p className="text-xs text-slate-500">{orders.length} record{orders.length === 1 ? "" : "s"}</p>
          </div>
          <Button size="sm" onClick={() => setSaleOpen(true)}>New Sale</Button>
        </div>

        {loading ? loadingBlock : loadError ? errorBlock : !orders.length ? (
          <EmptyState
            icon={<ShoppingBag size={22} />}
            title="No walk-in sales yet"
            hint="Counter sales will appear here with their products and payment method."
            action={<Button size="sm" onClick={() => setSaleOpen(true)}>New Walk-in Sale</Button>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Transaction ID</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Products</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o: any) => (
                    <tr key={o.id} className="align-top hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-navy">{o.orderNumber}</td>
                      <td className="break-words px-4 py-3 text-slate-700">{o.customerName || "Walk-in"}</td>
                      <td className="break-words px-4 py-3 text-slate-700">{saleProducts(o)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{saleQuantity(o)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">₱{Number(o.totalAmount || 0).toFixed(2)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{o.paymentMethod || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge>{o.orderStatus}</Badge>
                          <select className="rounded border p-1 text-xs" value={o.orderStatus} onChange={(e) => updateSaleStatus(o.id, e.target.value)}>
                            {["PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEditSale(o)}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => setDel({ type: "sale", id: o.id })}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {orders.map((o: any) => (
                <div key={o.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-navy break-words">{o.orderNumber}</div>
                      <div className="text-sm text-slate-600 break-words">{o.customerName || "Walk-in"}</div>
                    </div>
                    <Badge>{o.orderStatus}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-1 text-sm">
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Products</dt><dd className="min-w-0 break-words text-slate-700">{saleProducts(o)}</dd></div>
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Quantity</dt><dd className="text-slate-700">{saleQuantity(o)}</dd></div>
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Total</dt><dd className="text-slate-700">₱{Number(o.totalAmount || 0).toFixed(2)}</dd></div>
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Payment</dt><dd className="min-w-0 break-words text-slate-700">{o.paymentMethod || "—"}</dd></div>
                    <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Date</dt><dd className="text-slate-700">{fmtDate(o.createdAt)}</dd></div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select className="rounded border p-1 text-xs" value={o.orderStatus} onChange={(e) => updateSaleStatus(o.id, e.target.value)}>
                      {["PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Button size="sm" variant="secondary" onClick={() => openEditSale(o)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDel({ type: "sale", id: o.id })}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={custOpen} onClose={() => setCustOpen(false)} title="Register Walk-in Customer">
        <Input label="Name" value={cust.fullName} onChange={(e) => setCust({ ...cust, fullName: e.target.value })} />
        <Input label="Phone" value={cust.phoneNumber} onChange={(e) => setCust({ ...cust, phoneNumber: e.target.value })} />
        <Input label="Email (optional)" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} />
        <Button onClick={regCust}>Register</Button>
      </Modal>

      <Modal open={repairOpen} onClose={() => setRepairOpen(false)} title="New Walk-in Repair" size="max-w-2xl">
        <Input label="Customer Name" value={repair.customerName} onChange={(e) => setRepair({ ...repair, customerName: e.target.value })} />
        <Input label="Contact Number" value={repair.contactNumber} onChange={(e) => setRepair({ ...repair, contactNumber: e.target.value })} />
        <Input label="Device Type" value={repair.deviceType} onChange={(e) => setRepair({ ...repair, deviceType: e.target.value })} />
        <Input label="Brand" value={repair.brand} onChange={(e) => setRepair({ ...repair, brand: e.target.value })} />
        <Input label="Model" value={repair.model} onChange={(e) => setRepair({ ...repair, model: e.target.value })} />
        <Textarea label="Problem" value={repair.problemDescription} onChange={(e) => setRepair({ ...repair, problemDescription: e.target.value })} />
        <Input label="Service Type" value={repair.serviceType} onChange={(e) => setRepair({ ...repair, serviceType: e.target.value })} />
        <Input label="Technician" value={repair.technician} onChange={(e) => setRepair({ ...repair, technician: e.target.value })} />
        <Input label="Expected Completion" type="date" value={repair.expectedCompletionDate} onChange={(e) => setRepair({ ...repair, expectedCompletionDate: e.target.value })} />
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Repair Cost</label>
          <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" inputMode="decimal" value={repair.repairCost} onChange={(e) => setRepair({ ...repair, repairCost: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Type amount" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid</label>
          <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" inputMode="decimal" value={repair.amountPaid} onChange={(e) => setRepair({ ...repair, amountPaid: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Type amount" />
        </div>
        <Button onClick={createRepair}>Create</Button>
      </Modal>

      <Modal open={!!editRepair} onClose={() => setEditRepair(null)} title="Edit Walk-in Repair" size="max-w-2xl">
        {editRepair && (
          <>
            <Input label="Customer Name" value={editRepair.customerName} onChange={(e) => setEditRepair({ ...editRepair, customerName: e.target.value })} />
            <Input label="Contact Number" value={editRepair.contactNumber} onChange={(e) => setEditRepair({ ...editRepair, contactNumber: e.target.value })} />
            <Input label="Device Type" value={editRepair.deviceType} onChange={(e) => setEditRepair({ ...editRepair, deviceType: e.target.value })} />
            <Input label="Brand" value={editRepair.brand} onChange={(e) => setEditRepair({ ...editRepair, brand: e.target.value })} />
            <Input label="Model" value={editRepair.model} onChange={(e) => setEditRepair({ ...editRepair, model: e.target.value })} />
            <Textarea label="Problem" value={editRepair.problemDescription} onChange={(e) => setEditRepair({ ...editRepair, problemDescription: e.target.value })} />
            <Input label="Service Type" value={editRepair.serviceType} onChange={(e) => setEditRepair({ ...editRepair, serviceType: e.target.value })} />
            <Input label="Technician" value={editRepair.technician} onChange={(e) => setEditRepair({ ...editRepair, technician: e.target.value })} />
            <Input label="Expected Completion" type="date" value={editRepair.expectedCompletionDate} onChange={(e) => setEditRepair({ ...editRepair, expectedCompletionDate: e.target.value })} />
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Repair Cost</label>
              <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" inputMode="decimal" value={editRepair.repairCost} onChange={(e) => setEditRepair({ ...editRepair, repairCost: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Type amount" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid</label>
              <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" inputMode="decimal" value={editRepair.amountPaid} onChange={(e) => setEditRepair({ ...editRepair, amountPaid: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Type amount" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditRepair(null)}>Cancel</Button>
              <Button onClick={saveRepair}>Save Changes</Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={saleOpen} onClose={() => setSaleOpen(false)} title="New Walk-in Sale">
        <Input label="Customer Name" value={sale.customerName} onChange={(e) => setSale({ ...sale, customerName: e.target.value })} />
        <select className="w-full border rounded p-2 mb-3" value={sale.productId} onChange={(e) => setSale({ ...sale, productId: e.target.value })}>
          <option value="">Select product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.productName} (stock {p.stock})</option>)}
        </select>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
          <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" inputMode="numeric" value={sale.quantity} onChange={(e) => setSale({ ...sale, quantity: e.target.value.replace(/[^0-9]/g, "") })} placeholder="Type quantity" />
        </div>
        <select className="w-full border rounded p-2 mb-3" value={sale.paymentMethod} onChange={(e) => setSale({ ...sale, paymentMethod: e.target.value })}>
          <option>Cash</option><option>GCash</option><option>Maya</option><option>Bank Transfer</option>
        </select>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid</label>
          <input className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" inputMode="decimal" value={sale.amountPaid} onChange={(e) => setSale({ ...sale, amountPaid: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Type amount" />
        </div>
        <Button onClick={createSale}>Complete Sale</Button>
      </Modal>

      <Modal open={!!editSale} onClose={() => setEditSale(null)} title="Edit Walk-in Sale">
        {editSale && (
          <>
            <Input label="Customer Name" value={editSale.customerName} onChange={(e) => setEditSale({ ...editSale, customerName: e.target.value })} />
            <Select label="Delivery Method" value={editSale.deliveryMethod} onChange={(e) => setEditSale({ ...editSale, deliveryMethod: e.target.value })}>
              <option value="PICKUP">PICKUP</option>
              <option value="DELIVERY">DELIVERY</option>
            </Select>
            <Input label="Delivery Address" value={editSale.deliveryAddress} onChange={(e) => setEditSale({ ...editSale, deliveryAddress: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditSale(null)}>Cancel</Button>
              <Button onClick={saveSale}>Save Changes</Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        title={del?.type === "repair" ? "Delete Repair" : "Delete Sale"}
        message={del?.type === "repair" ? "Delete this walk-in repair permanently?" : "Delete this walk-in sale? Stock will be restored and linked invoices/payments removed."}
      />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};
