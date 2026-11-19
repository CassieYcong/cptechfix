import React from "react";
import api from "../../lib/axios";
import { StatCard, Card, Button } from "../../components/ui";
import { Wrench, Package, Clock, Activity, ArrowRight, Plus, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CustomerDashboard: React.FC = () => {
  const nav = useNavigate();
  const [stats, setStats] = React.useState({ repairs: 0, pending: 0, orders: 0, completed: 0 });
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/repairs");
        const o = await api.get("/orders");
        setStats({
          repairs: r.data.length,
          pending: r.data.filter((x: any) => x.status === "PENDING").length,
          orders: o.data.length,
          completed: o.data.filter((x: any) => x.orderStatus === "COMPLETED").length,
        });
        const acts = [
          ...r.data.slice(0, 4).map((x: any) => ({ id: x.id, label: x.referenceNumber, sub: x.deviceType, status: x.status, type: "repair", date: x.createdAt })),
          ...o.data.slice(0, 4).map((x: any) => ({ id: x.id, label: x.orderNumber, sub: `₱${Number(x.totalAmount).toFixed(2)}`, status: x.orderStatus, type: "order", date: x.createdAt })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
        setActivities(acts);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy via-navy-light to-brandgreen p-6 md:p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-bold">Welcome back! 👋</h1>
          <p className="text-white/80 mt-1 max-w-xl">Track your repairs, manage orders, and shop accessories — all in one place.</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={() => nav("/repairs")} className="px-4 py-2 rounded-lg bg-white text-navy font-semibold text-sm hover:bg-slate-100 transition flex items-center gap-2">
              <Plus size={16} /> New Repair Request
            </button>
            <button onClick={() => nav("/accessories")} className="px-4 py-2 rounded-lg bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition flex items-center gap-2 ring-1 ring-white/30">
              <ShoppingBag size={16} /> Shop Accessories
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Repairs" value={stats.repairs} icon={<Wrench size={24} />} color="navy" trend="Total repair requests" />
        <StatCard label="Pending Requests" value={stats.pending} icon={<Clock size={24} />} color="amber" trend="Awaiting approval" />
        <StatCard label="Total Orders" value={stats.orders} icon={<Package size={24} />} color="blue" trend="Purchases made" />
        <StatCard label="Completed" value={stats.completed} icon={<Activity size={24} />} color="green" trend="Finished orders" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy">Recent Activity</h3>
            <button onClick={() => nav("/tracking")} className="text-sm text-navy font-medium hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></button>
          </div>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14" />)}</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Activity size={44} className="mx-auto mb-3 opacity-40" />
              <p className="mb-4">No activity yet. Start by requesting a repair or shopping accessories.</p>
              <Button onClick={() => nav("/accessories")} size="sm">Browse Accessories</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition group">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${a.type === "repair" ? "bg-navy/10 text-navy" : "bg-brandgreen/10 text-brandgreen"}`}>
                      {a.type === "repair" ? <Wrench size={18} /> : <Package size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 text-sm break-words">{a.label}</div>
                      <div className="text-xs text-slate-500 break-words">{a.sub} · {new Date(a.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${a.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : a.status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick links */}
        <Card className="p-5">
          <h3 className="font-bold text-navy mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "Request Repair", icon: Wrench, path: "/repairs", color: "bg-navy/10 text-navy" },
              { label: "Shop Accessories", icon: ShoppingBag, path: "/accessories", color: "bg-brandgreen/10 text-brandgreen" },
              { label: "My Orders", icon: Package, path: "/orders", color: "bg-blue-100 text-blue-700" },
              { label: "Billing History", icon: Activity, path: "/billing", color: "bg-amber-100 text-amber-700" },
              { label: "Leave a Review", icon: Activity, path: "/reviews", color: "bg-purple-100 text-purple-700" },
            ].map((q) => (
              <button key={q.label} onClick={() => nav(q.path)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left group">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${q.color}`}>
                  <q.icon size={16} />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-navy">{q.label}</span>
                <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-navy" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
