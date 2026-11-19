import React from "react";
import api from "../../lib/axios";
import { Card, Button, Input, Badge } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";

export const AdminRefunds: React.FC = () => {
  const [refunds, setRefunds] = React.useState<any[]>([]);
  const [cancellations, setCancellations] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ paymentId: "", orderId: "", refundAmount: 0, refundMethod: "Cash", refundReason: "" });
  const [edit, setEdit] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState({ refundAmount: 0, refundMethod: "Cash", refundReason: "" });
  const [delRefund, setDelRefund] = React.useState<string | null>(null);
  const [delCancel, setDelCancel] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const load = async () => {
    const [r, c] = await Promise.all([api.get("/refunds"), api.get("/cancellations")]);
    setRefunds(r.data);
    setCancellations(c.data);
  };
  React.useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api.post("/refunds", form); setOpen(false); setMsg("Refund created"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/refunds/${id}/status`, { status, remarks: "Updated" }); setMsg("Updated"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const openEdit = (r: any) => {
    setEdit(r);
    setEditForm({ refundAmount: Number(r.refundAmount), refundMethod: r.refundMethod || "Cash", refundReason: r.refundReason || "" });
  };

  const saveEdit = async () => {
    if (!edit) return;
    try {
      await api.put(`/refunds/${edit.id}`, { ...editForm, refundAmount: Number(editForm.refundAmount) });
      setEdit(null); setMsg("Refund updated"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const doDeleteRefund = async () => {
    if (!delRefund) return;
    try { await api.delete(`/refunds/${delRefund}`); setDelRefund(null); setMsg("Refund deleted"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDelRefund(null); }
  };

  const processCancel = async (id: string, action: "approve" | "reject") => {
    try { await api.patch(`/cancellations/${id}/${action}`); setMsg(`Cancellation ${action}d`); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const doDeleteCancel = async () => {
    if (!delCancel) return;
    try { await api.delete(`/cancellations/${delCancel}`); setDelCancel(null); setMsg("Cancellation deleted"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDelCancel(null); }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-navy">Refund Management</h1>
          <Button onClick={() => setOpen(true)}>Create Refund</Button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {refunds.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-navy">{r.refundReference}</div>
                  <div className="text-sm text-gray-600">Amount: ₱{Number(r.refundAmount).toFixed(2)} | {r.refundMethod}</div>
                  <div className="text-sm text-gray-500 break-words">{r.refundReason}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge>{r.refundStatus}</Badge>
                  <select className="border rounded p-1 text-sm" value={r.refundStatus} onChange={(e) => updateStatus(r.id, e.target.value)}>
                    {["REQUESTED","UNDER_REVIEW","APPROVED","PROCESSING","REFUNDED","REJECTED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                  {r.refundStatus !== "REFUNDED" && <Button variant="danger" onClick={() => setDelRefund(r.id)}>Delete</Button>}
                </div>
              </div>
            </Card>
          ))}
          {!refunds.length && <Card className="p-6 text-center text-slate-500">No refunds yet.</Card>}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-navy mb-4">Cancellation Requests</h2>
        <div className="grid grid-cols-1 gap-3">
          {cancellations.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-navy">{c.orderId ? "Order" : "Repair"} cancellation</div>
                  <div className="text-sm text-gray-600 break-words">{c.reason}</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge color={c.cancellationStatus === "APPROVED" ? "green" : c.cancellationStatus === "REJECTED" ? "red" : "yellow"}>{c.cancellationStatus}</Badge>
                  {c.cancellationStatus === "REQUESTED" && (
                    <>
                      <Button variant="green" size="sm" onClick={() => processCancel(c.id, "approve")}>Approve</Button>
                      <Button variant="secondary" size="sm" onClick={() => processCancel(c.id, "reject")}>Reject</Button>
                    </>
                  )}
                  {c.cancellationStatus !== "APPROVED" && <Button variant="danger" size="sm" onClick={() => setDelCancel(c.id)}>Delete</Button>}
                </div>
              </div>
            </Card>
          ))}
          {!cancellations.length && <Card className="p-6 text-center text-slate-500">No cancellation requests.</Card>}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Refund">
        <Input label="Payment ID" value={form.paymentId} onChange={(e) => setForm({ ...form, paymentId: e.target.value })} />
        <Input label="Order ID" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} />
        <Input label="Refund Amount" type="number" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: Number(e.target.value) })} />
        <Input label="Refund Method" value={form.refundMethod} onChange={(e) => setForm({ ...form, refundMethod: e.target.value })} />
        <Input label="Reason" value={form.refundReason} onChange={(e) => setForm({ ...form, refundReason: e.target.value })} />
        <Button onClick={create}>Create</Button>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit Refund">
        <Input label="Refund Amount" type="number" value={editForm.refundAmount} onChange={(e) => setEditForm({ ...editForm, refundAmount: Number(e.target.value) })} />
        <Input label="Refund Method" value={editForm.refundMethod} onChange={(e) => setEditForm({ ...editForm, refundMethod: e.target.value })} />
        <Input label="Reason" value={editForm.refundReason} onChange={(e) => setEditForm({ ...editForm, refundReason: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
          <Button onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delRefund} onClose={() => setDelRefund(null)} onConfirm={doDeleteRefund} title="Delete Refund" message="Delete this refund record?" />
      <ConfirmDialog open={!!delCancel} onClose={() => setDelCancel(null)} onConfirm={doDeleteCancel} title="Delete Cancellation" message="Delete this cancellation request?" />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};
