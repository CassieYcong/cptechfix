import React from "react";
import api from "../../lib/axios";
import { Card, Button, Badge } from "../../components/ui";
import { Modal, SuccessModal, ErrorModal } from "../../components/ui/Modal";
import { Wrench, Search, ChevronRight, User, Monitor } from "lucide-react";

const statusColor: Record<string, string> = {
  PENDING: "bg-red-100 text-red-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  REPAIRING: "bg-blue-100 text-blue-700",
  READY: "bg-emerald-100 text-emerald-700",
};

const avatarColor = (name: string) => {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
};
const initials = (name: string) => (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const AdminRepairs: React.FC = () => {
  const [repairs, setRepairs] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All Status");
  const [selected, setSelected] = React.useState<any>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  const load = async () => { const r = await api.get("/repairs"); setRepairs(r.data); };
  React.useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/repairs/${id}/status`, { status }); setMsg("Status updated"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed"); }
  };

  const filtered = repairs.filter((r) => {
    const q = search.toLowerCase();
    const matchQ = !q || (r.referenceNumber || "").toLowerCase().includes(q) || (r.customerName || "").toLowerCase().includes(q) || (r.deviceType || "").toLowerCase().includes(q);
    const matchS = statusFilter === "All Status" || r.status === statusFilter;
    return matchQ && matchS;
  });

  const activeCount = repairs.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED").length;
  const revenue = repairs.reduce((a, r) => a + (r.status !== "CANCELLED" ? Number(r.repairCost) : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Repair Requests</h1>
        <div className="flex flex-wrap gap-3">
          <Card className="px-4 py-2 flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Wrench size={18} /></div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Total Active Repairs</div>
              <div className="text-lg font-bold text-navy">{activeCount}</div>
            </div>
            <svg width="60" height="24" className="hidden sm:block shrink-0">
              <polyline points="0,18 10,14 20,16 30,10 40,12 50,6 60,8" fill="none" stroke="#3b82f6" strokeWidth="2" />
            </svg>
          </Card>
          <Card className="px-4 py-2 flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><DollarSignIcon /></div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Revenue this month</div>
              <div className="text-lg font-bold text-navy flex items-center gap-1 flex-wrap">₱{revenue.toLocaleString()} <span className="text-xs text-emerald-600 font-semibold">+12%</span></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, customer, device..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option>All Status</option>
          {["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">ID#</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Device</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Technicians</th>
                <th className="text-left px-4 py-3">Cost</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-navy">{r.referenceNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{r.customerName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 flex items-center gap-2"><Monitor size={14} className="text-slate-400" /> {r.deviceType}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[r.status] || "bg-slate-100 text-slate-700"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${avatarColor(r.technician || r.updatedBy || "")} text-white text-xs font-bold flex items-center justify-center`}>
                        {initials(r.technician || "Unassigned")}
                      </div>
                      <span className="text-slate-600 text-xs">{r.technician || "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">₱{Number(r.repairCost).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(r)} className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1">
                      View All <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No repairs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom action */}
      <div className="flex justify-end">
        <Button onClick={() => setSelected(filtered[0] || null)} disabled={filtered.length === 0}>
          <Wrench size={16} /> Repair Details
        </Button>
      </div>

      {/* Details modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Repair Details" size="max-w-2xl">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">ID</div><div className="font-semibold text-navy">{selected.referenceNumber}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Status</div><div><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[selected.status]}`}>{selected.status}</span></div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Customer</div><div className="font-semibold text-navy">{selected.customerName || "—"}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Device</div><div className="font-semibold text-navy">{selected.deviceType} {selected.brand} {selected.model}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Technician</div><div className="font-semibold text-navy">{selected.technician || "Unassigned"}</div></div>
              <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs">Cost</div><div className="font-semibold text-navy">₱{Number(selected.repairCost).toFixed(2)}</div></div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500 text-xs mb-1">Problem</div><div className="text-slate-700">{selected.problemDescription}</div></div>
            <div className="flex gap-2 pt-2">
              <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)}>
                {["PENDING","APPROVED","IN_PROGRESS","COMPLETED","CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </Modal>

      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};

function DollarSignIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}
