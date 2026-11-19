import React from "react";
import api from "../../lib/axios";
import { useAuth } from "../../components/context/AuthContext";
import { Card, Button, Input, Textarea, Select } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";
import { Star, User as UserIcon, Camera, Trash2, Loader2 } from "lucide-react";
import { mediaUrl } from "../../lib/media";

export const CustomerReviews: React.FC = () => {
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [repairs, setRepairs] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({ type: "order", id: "", rating: 5, title: "", comment: "" });
  const [edit, setEdit] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState({ rating: 5, title: "", comment: "" });
  const [delId, setDelId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const load = async () => {
    const r = await api.get("/reviews/my-reviews");
    setReviews(r.data);
    try {
      const o = await api.get("/orders");
      setOrders((o.data || []).filter((x: any) => x.orderStatus === "COMPLETED"));
    } catch {}
    try {
      const rp = await api.get("/repairs");
      setRepairs((rp.data || []).filter((x: any) => x.status === "COMPLETED"));
    } catch {}
  };
  React.useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.id) { setErr("Please select a completed transaction."); return; }
    if (!form.comment.trim()) { setErr("Please write a comment."); return; }
    try {
      const payload: any = { rating: Number(form.rating), title: form.title, comment: form.comment };
      if (form.type === "order") payload.orderId = form.id; else payload.repairId = form.id;
      await api.post("/reviews", payload);
      setMsg("Review submitted");
      setForm({ type: "order", id: "", rating: 5, title: "", comment: "" });
      load();
    } catch (e: any) {
      const data = e.response?.data;
      let m = data?.message || "Failed";
      if (m === "Validation error") {
        const flat = Object.values(data?.errors?.fieldErrors || {}).flat();
        m = (flat[0] as string) || "Please check your input. Make sure you selected a valid completed transaction.";
      }
      setErr(m);
    }
  };

  const openEdit = (r: any) => {
    setEdit(r);
    setEditForm({ rating: r.rating, title: r.title || "", comment: r.comment || "" });
  };

  const saveEdit = async () => {
    if (!edit) return;
    try {
      await api.put(`/reviews/${edit.id}`, { ...editForm, rating: Number(editForm.rating) });
      setEdit(null); setMsg("Review updated"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const doDelete = async () => {
    if (!delId) return;
    try { await api.delete(`/reviews/${delId}`); setDelId(null); setMsg("Review deleted"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); setDelId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Reviews</h1>
        <p className="text-slate-500 text-sm mt-1">Share your experience</p>
      </div>
      <Card className="p-6">
        <h3 className="font-bold text-navy mb-4 flex items-center gap-2"><Star size={18} className="text-amber-500" /> Submit Review</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, id: "" })}>
            <option value="order">Order</option>
            <option value="repair">Repair</option>
          </Select>
          <Select label="Completed Transaction" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })}>
            <option value="">Select a completed transaction</option>
            {form.type === "order"
              ? orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} — ₱{Number(o.totalAmount).toFixed(2)}</option>)
              : repairs.map((r) => <option key={r.id} value={r.id}>{r.referenceNumber} — {r.deviceType}</option>)}
          </Select>
          {form.type === "order" && orders.length === 0 && <p className="text-xs text-slate-500">No completed orders yet. Complete an order to leave a review.</p>}
          {form.type === "repair" && repairs.length === 0 && <p className="text-xs text-slate-500">No completed repairs yet.</p>}
        </div>
        <Select label="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} star{n>1?"s":""}</option>)}
        </Select>
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea label="Comment" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        <Button onClick={submit}>Submit Review</Button>
      </Card>
      <div className="grid grid-cols-1 gap-4">
        {reviews.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-center justify-between mb-2 gap-3">
              <div className="min-w-0 font-bold text-navy break-words">{r.title || "Untitled review"}</div>
              <div className="flex shrink-0 items-center gap-1 text-amber-500">{Array.from({length: r.rating}).map((_,i) => <Star key={i} size={14} fill="currentColor" />)}</div>
            </div>
            <div className="text-slate-600 text-sm break-words">{r.comment}</div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setDelId(r.id)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit Review">
        <Select label="Rating" value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: Number(e.target.value) })}>
          {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </Select>
        <Input label="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
        <Textarea label="Comment" value={editForm.comment} onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
          <Button onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Delete Review" message="Delete this review permanently?" />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = React.useState({ fullName: "", email: "", phoneNumber: "", profileImage: "" });
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const resetForm = React.useCallback(() => {
    if (user) setForm({
      fullName: user.fullName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      profileImage: user.profileImage || "",
    });
  }, [user]);

  React.useEffect(() => { resetForm(); }, [resetForm]);

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setErr("Image must be 5 MB or smaller."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/uploads", fd);
      setForm((f) => ({ ...f, profileImage: r.data.url }));
      setMsg("Photo uploaded. Click Save Changes to apply.");
    } catch (e: any) {
      setErr(e.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.fullName.trim()) { setErr("Full name is required."); return; }
    setSaving(true);
    try {
      await api.put("/auth/me", form);
      await refreshUser();
      setMsg("Profile updated");
    } catch (e: any) {
      setErr(e.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const preview = mediaUrl(form.profileImage);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account details and profile photo</p>
      </div>
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 mb-6 pb-6 border-b border-slate-100">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-md bg-gradient-to-br from-navy to-brandgreen text-white flex items-center justify-center text-3xl font-bold">
              {preview ? (
                <img src={preview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (form.fullName || user?.fullName || "U").charAt(0).toUpperCase()
              )}
            </div>
            <button
              type="button"
              onClick={pickFile}
              disabled={uploading}
              title="Change photo"
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brandgreen text-white flex items-center justify-center shadow-md hover:opacity-90 transition disabled:opacity-60"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
          <div className="text-center sm:text-left min-w-0">
            <div className="font-bold text-navy text-lg break-words">{form.fullName || user?.fullName}</div>
            <div className="text-sm text-slate-500 break-words">{form.email || user?.email}</div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
              <button type="button" onClick={pickFile} disabled={uploading} className="text-sm font-semibold text-navy hover:underline disabled:opacity-60">
                {uploading ? "Uploading..." : form.profileImage ? "Change Photo" : "Upload Photo"}
              </button>
              {form.profileImage && (
                <button type="button" onClick={() => setForm({ ...form, profileImage: "" })} className="text-sm font-semibold text-red-600 hover:underline flex items-center gap-1">
                  <Trash2 size={14} /> Remove
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG or GIF. Max 5 MB.</p>
          </div>
        </div>

        <Input label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving || uploading}>{saving ? "Saving..." : "Save Changes"}</Button>
          <Button variant="secondary" onClick={resetForm} disabled={saving}>Reset</Button>
        </div>
      </Card>
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};
