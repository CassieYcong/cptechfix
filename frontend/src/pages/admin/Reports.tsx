import React from "react";
import api from "../../lib/axios";
import { Card, Button } from "../../components/ui";
import { DollarSign, TrendingUp } from "lucide-react";

export const AdminReports: React.FC = () => {
  const [stats, setStats] = React.useState<any>({});
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const load = async () => {
    const r = await api.get("/reports/revenue", { params: { from, to } });
    setStats(r.data);
  };
  React.useEffect(() => { load(); }, []);

  const pm = stats.paymentMethods || {};
  const pmTotal = Object.values(pm).reduce((a: number, v: any) => a + Number(v), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy">Revenue Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Financial analytics and breakdowns</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="date" className="border border-slate-200 rounded-lg p-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="border border-slate-200 rounded-lg p-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button onClick={load}>Filter</Button>
          <Button variant="secondary" onClick={async () => { try { const r = await api.get("/reports/export", { responseType: "blob" }); const url = URL.createObjectURL(new Blob([r.data], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "cptechfix-report.csv"; a.click(); URL.revokeObjectURL(url); } catch { /* ignore */ } }}>Export CSV</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: stats.totalRevenue, color: "navy" },
          { label: "Net Revenue", value: stats.netRevenue, color: "green" },
          { label: "Total Refunds", value: stats.totalRefunds, color: "red" as any },
          { label: "Outstanding", value: stats.outstandingBalances, color: "amber" as any },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-slate-500 text-xs uppercase tracking-wide">{s.label}</div>
            <div className="text-2xl font-bold text-navy mt-1">₱{Number(s.value || 0).toFixed(2)}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-bold text-navy mb-4 flex items-center gap-2"><DollarSign size={18} /> Payment Method Breakdown</h3>
          {Object.keys(pm).length === 0 ? <p className="text-slate-400 text-sm">No payments yet.</p> : (
            <div className="space-y-3">
              {Object.entries(pm).map(([method, amt]: any) => (
                <div key={method}>
                  <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm mb-1">
                    <span className="text-slate-600 break-words">{method}</span>
                    <span className="font-semibold text-navy text-right">₱{Number(amt).toFixed(2)} ({((Number(amt) / pmTotal) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-navy to-brandgreen rounded-full" style={{ width: `${(Number(amt) / pmTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-navy mb-4 flex items-center gap-2"><TrendingUp size={18} /> Best-Selling Products</h3>
          {(stats.bestSelling || []).length === 0 ? <p className="text-slate-400 text-sm">No sales yet.</p> : (
            <div className="space-y-3">
              {(stats.bestSelling || []).map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-navy/10 text-navy text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="min-w-0 break-words text-sm text-slate-700">{p.name}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-navy">{p.sold} sold</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card className="p-5">
        <h3 className="font-bold text-navy mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {["totalSales","repairServiceRevenue","walkInRevenue","onlineRevenue","cashCollected","totalOrders","totalRepairs"].map((k) => (
            <div key={k} className="bg-slate-50 rounded-xl p-4 min-w-0">
              <div className="text-slate-500 text-xs uppercase tracking-wide break-words">{k.replace(/([A-Z])/g, " $1")}</div>
              <div className="text-lg font-bold text-navy mt-1 break-words">{typeof stats[k] === "number" ? (k.toLowerCase().includes("revenue") || k.toLowerCase().includes("collected") ? `₱${stats[k].toFixed(2)}` : stats[k]) : "—"}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
