import React from "react";
import api from "../../lib/axios";
import { Card, Button, Badge, Input, Select } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";
import { Star, Search, Filter } from "lucide-react";

export const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [edit, setEdit] = React.useState<any>(null);
  const [form, setForm] = React.useState({ rating: 5, title: "", comment: "" });
  const [delId, setDelId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const [q, setQ] = React.useState("");
  const [ratingFilter, setRatingFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [sort, setSort] = React.useState("newest");
  const [page, setPage] = React.useState(1);
  const pageSize = 8;

  const load = async () => { const r = await api.get("/reviews"); setReviews(r.data); };
  React.useEffect(() => { load(); }, []);

  const moderate = async (id: string, moderationStatus: string) => {
    try { await api.patch(`/reviews/${id}/moderate`, { moderationStatus }); setMsg("Updated"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const openEdit = (r: any) => {
    setEdit(r);
    setForm({ rating: r.rating, title: r.title || "", comment: r.comment || "" });
  };

  const save = async () => {
    if (!edit) return;
    try {
      await api.put(`/reviews/${edit.id}`, { ...form, rating: Number(form.rating) });
      setEdit(null); setMsg("Review updated"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const doDelete = async () => {
    if (!delId) return;
    try { await api.delete(`/reviews/${delId}`); setDelId(null); setMsg("Review deleted"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDelId(null); }
  };

  const statusLabel = (s: string) => {
    if (s === "PENDING") return "Pending";
    if (s === "APPROVED" || s === "VISIBLE") return "Approved";
    if (s === "REJECTED" || s === "HIDDEN") return "Rejected";
    return s;
  };
  const statusColor = (s: string) => {
    const l = statusLabel(s);
    return l === "Approved" ? "green" : l === "Rejected" ? "red" : "yellow";
  };

  const filtered = reviews.filter((r) => {
    if (q && !(r.user?.fullName?.toLowerCase().includes(q.toLowerCase()) || r.title?.toLowerCase().includes(q.toLowerCase()) || r.comment?.toLowerCase().includes(q.toLowerCase()))) return false;
    if (ratingFilter && r.rating !== Number(ratingFilter)) return false;
    if (statusFilter && statusLabel(r.moderationStatus) !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return sort === "newest" ? db - da : da - db;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const total = reviews.length;
  const avgRating = total ? (reviews.reduce((a, r) => a + r.rating, 0) / total).toFixed(1) : "0.0";
  const pending = reviews.filter((r) => statusLabel(r.moderationStatus) === "Pending").length;
  const approved = reviews.filter((r) => statusLabel(r.moderationStatus) === "Approved").length;
  const rejected = reviews.filter((r) => statusLabel(r.moderationStatus) === "Rejected").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Customer Reviews</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4"><div className="text-xs text-slate-500">Total Reviews</div><div className="text-2xl font-bold text-navy">{total}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Avg Rating</div><div className="text-2xl font-bold text-amber-500">{avgRating}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Pending</div><div className="text-2xl font-bold text-amber-600">{pending}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Approved</div><div className="text-2xl font-bold text-emerald-600">{approved}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Rejected</div><div className="text-2xl font-bold text-red-600">{rejected}</div></Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by customer, title, comment" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <select value={ratingFilter} onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {pageItems.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {r.user?.profileImage ? <img src={r.user.profileImage.startsWith("http") ? r.user.profileImage : "http://localhost:5000" + r.user.profileImage} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-400 text-sm">{(r.user?.fullName || "?").charAt(0)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy">{r.user?.fullName || "Unknown"}</span>
                    <div className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}</div>
                    <Badge color={statusColor(r.moderationStatus)}>{statusLabel(r.moderationStatus)}</Badge>
                  </div>
                  <div className="text-sm font-medium text-slate-700 mt-1">{r.title || "Untitled review"}</div>
                  <div className="text-sm text-slate-600 break-words mt-1">{r.comment}</div>
                  <div className="text-xs text-slate-400 mt-2">{new Date(r.createdAt).toLocaleString()} {r.orderId ? `· Order ${r.orderId.slice(0, 8)}` : r.repairId ? `· Repair ${r.repairId.slice(0, 8)}` : ""}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {statusLabel(r.moderationStatus) === "Pending" && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => moderate(r.id, "APPROVED")}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => moderate(r.id, "REJECTED")}>Reject</Button>
                  </>
                )}
                <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setDelId(r.id)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
        {pageItems.length === 0 && <Card className="p-6 text-center text-slate-500">No customer reviews yet.</Card>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit Review">
        <Select label="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </Select>
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm mb-3" rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
          <Button onClick={save}>Save Changes</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Delete Review" message="Delete this review permanently?" />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};