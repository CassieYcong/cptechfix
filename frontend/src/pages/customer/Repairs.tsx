import React from "react";
import api from "../../lib/axios";
import { Card, Button, Input, Textarea, Select, Badge } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal, LoginRequiredModal } from "../../components/ui/Modal";
import { useAuth } from "../../components/context/AuthContext";
import { Wrench, Plus, Eye, XCircle, Calendar, Smartphone, Pencil, Trash2, X } from "lucide-react";

const statusColor: Record<string,string> = { PENDING: "yellow", APPROVED: "blue", IN_PROGRESS: "blue", COMPLETED: "green", CANCELLED: "red" };
const EMPTY_FORM = { deviceType: "", brand: "", model: "", problemDescription: "", preferredDate: "", imageUrl: "" };

export const CustomerRepairs: React.FC = () => {
  const { user, token } = useAuth();
  const [repairs, setRepairs] = React.useState<any[]>([]);
  const formRef = React.useRef<HTMLDivElement>(null);
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  const [detail, setDetail] = React.useState<any>(null);
  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loginModal, setLoginModal] = React.useState(false);

  const load = async () => { if (!token) { setRepairs([]); return; } try { const r = await api.get("/repairs"); setRepairs(r.data); } catch {} };
  React.useEffect(() => { load(); }, [token]);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); };
  const openForm = () => { resetForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const closeForm = () => { resetForm(); setShowForm(false); };

  const submit = async () => {
    if (!user) { setLoginModal(true); return; }
    if (!form.deviceType.trim() || !form.problemDescription.trim()) {
      setErr("Device type and problem description are required.");
      return;
    }
    try {
      if (editId) {
        await api.put(`/repairs/${editId}`, form);
        setMsg("Repair request updated successfully");
      } else {
        await api.post("/repairs", form);
        setMsg("Repair request submitted successfully");
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (e: any) {
      if (e.response?.status === 401) { setLoginModal(true); return; }
      setErr(e.response?.data?.message || "Failed");
    }
  };

  const startEdit = (r: any) => {
    if (!user) { setLoginModal(true); return; }
    setEditId(r.id);
    setForm({
      deviceType: r.deviceType || "",
      brand: r.brand || "",
      model: r.model || "",
      problemDescription: r.problemDescription || "",
      preferredDate: r.preferredDate ? new Date(r.preferredDate).toISOString().slice(0, 10) : "",
      imageUrl: r.imageUrl || "",
    });
    setDetail(null);
    setShowForm(true);
    setTimeout(scrollToForm, 60);
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/repairs/${deleteId}`);
      if (editId === deleteId) resetForm();
      setDeleteId(null);
      setMsg("Repair request deleted");
      load();
    } catch (e: any) {
      if (e.response?.status === 401) { setLoginModal(true); return; }
      setErr(e.response?.data?.message || "Failed");
      setDeleteId(null);
    }
  };

  const cancel = async () => {
    if (!cancelId) return;
    try {
      await api.post(`/repairs/${cancelId}/cancel`, { reason: "Customer request" });
      setCancelId(null);
      setMsg("Repair cancelled");
      load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); setCancelId(null); }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy">Repair Services</h1>
          <p className="text-slate-500 text-sm mt-1">Submit and track your repair requests</p>
        </div>
        <Button onClick={openForm}><Plus size={16} /> New Repair Request</Button>
      </div>

      {showForm && (
        <div ref={formRef} className="flex items-center justify-center min-h-[calc(100dvh-220px)] py-2">
          <Card className="p-6 w-full max-w-3xl">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0"><Wrench size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-navy">{editId ? "Edit Repair Request" : "New Repair Request"}</h2>
                  <p className="text-sm text-slate-500">{editId ? "Update the details of your pending repair request." : "Tell us about your device and the issue you are experiencing."}</p>
                </div>
              </div>
              <button onClick={closeForm} aria-label="Close" className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition shrink-0">
                <X size={20} />
              </button>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Device Type" value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })} required placeholder="Laptop, Desktop, Phone..." />
            <Input label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Dell, HP, Apple..." />
            <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <Input label="Preferred Date" type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
          </div>
          <Textarea label="Problem Description" value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })} required placeholder="Describe the issue..." />
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Device Image (optional)</label>
            <input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append("file", f);
              try {
                const r = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
                setForm((prev) => ({ ...prev, imageUrl: r.data.url }));
              } catch {}
            }} className="block w-full max-w-full min-w-0 text-sm" />
            {form.imageUrl && <img src={form.imageUrl.startsWith("http") ? form.imageUrl : "http://localhost:5000" + form.imageUrl} alt="preview" className="mt-2 h-24 rounded-lg object-cover" />}
          </div>
          <div className="flex justify-end gap-2">
            {editId ? (
              <>
                <Button variant="secondary" onClick={resetForm}>Cancel Edit</Button>
                <Button onClick={submit}>Update Request</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={resetForm}>Clear</Button>
                <Button onClick={submit}>Submit Request</Button>
              </>
            )}
          </div>
          </Card>
        </div>
      )}

      {repairs.length === 0 ? (
        <Card className="p-12 text-center">
          <Wrench size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No repair requests yet. Click “+ New Repair Request” above to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {repairs.map((r) => (
            <Card key={r.id} className="p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0"><Smartphone size={22} /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-navy">{r.referenceNumber}</span>
                      <Badge color={statusColor[r.status] || "gray"}>{r.status}</Badge>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{r.deviceType} {r.brand} {r.model}</div>
                    <div className="text-sm text-slate-500 mt-1 break-words">{r.problemDescription}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(r.createdAt).toLocaleDateString()}</span>
                      <span>Cost: ₱{Number(r.repairCost).toFixed(2)}</span>
                      <span>Paid: ₱{Number(r.amountPaid).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={() => setDetail(r)}><Eye size={14} /> Details</Button>
                  {r.status === "PENDING" && <Button variant="secondary" size="sm" onClick={() => startEdit(r)}><Pencil size={14} /> Edit</Button>}
                  {r.status === "PENDING" && <Button variant="danger" size="sm" onClick={() => setCancelId(r.id)}><XCircle size={14} /> Cancel</Button>}
                  {(r.status === "PENDING" || r.status === "CANCELLED") && <Button variant="danger" size="sm" onClick={() => setDeleteId(r.id)}><Trash2 size={14} /> Delete</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Repair Details" size="max-w-2xl">
        {detail && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Reference</div><div className="font-semibold text-navy">{detail.referenceNumber}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Status</div><div className="font-semibold"><Badge color={statusColor[detail.status]}>{detail.status}</Badge></div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Device</div><div className="font-semibold text-navy">{detail.deviceType} {detail.brand} {detail.model}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Preferred Date</div><div className="font-semibold text-navy">{detail.preferredDate ? new Date(detail.preferredDate).toLocaleDateString() : "—"}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Cost</div><div className="font-semibold text-navy">₱{Number(detail.repairCost).toFixed(2)}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Balance</div><div className="font-semibold text-navy">₱{Number(detail.remainingBalance).toFixed(2)}</div></div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm"><div className="text-slate-500 text-xs mb-1">Problem</div><div className="text-slate-700">{detail.problemDescription}</div></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!cancelId} onClose={() => setCancelId(null)} onConfirm={cancel} title="Cancel Repair" message="Cancel this repair request? This cannot be undone." />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title="Delete Repair" message="Delete this repair request permanently? This cannot be undone." />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
      <LoginRequiredModal open={loginModal} onClose={() => setLoginModal(false)} message="Please log in to your account or create an account to submit your repair request." />

    </div>
  );
};
