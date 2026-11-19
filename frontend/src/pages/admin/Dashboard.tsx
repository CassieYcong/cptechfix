import React from "react";
import api from "../../lib/axios";
import { StatCard, Card, Button } from "../../components/ui";
import { DollarSign, ShoppingCart, Wrench, Users, TrendingUp, Package, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AdminDashboard: React.FC = () => {
  const nav = useNavigate();
  const [stats, setStats] = React.useState<any>({});
  const [orders, setOrders] = React.useState<any[]>([]);
  const [repairs, setRepairs] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [r, o, rep, p] = await Promise.all([
          api.get("/reports/revenue"),
          api.get("/orders"),
          api.get("/repairs"),
          api.get("/products"),
        ]);
        setStats(r.data);
        setOrders(o.data.slice(0, 5));
        setRepairs(rep.data.slice(0, 5));
        setProducts(p.data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const pm = stats.paymentMethods || {};
  const pmTotal = Object.values(pm).reduce((a: number, v: any) => a + Number(v), 0) || 1;
  const lowStock = products.filter((p) => p.stock <= p.minimumStock);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy via-navy-light to-brandgreen p-6 md:p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard 👋</h1>
            <p className="text-white/80 mt-1">Here's what's happening in your shop today.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => nav("/admin/walkins")} className="px-4 py-2 rounded-lg bg-white text-navy font-semibold text-sm hover:bg-slate-100 transition">+ New Walk-In</button>
            <button onClick={() => nav("/admin/products")} className="px-4 py-2 rounded-lg bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition ring-1 ring-white/30">+ Add Product</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₱${Number(stats.totalRevenue || 0).toFixed(2)}`} icon={<DollarSign size={24} />} color="navy" trend="Gross sales + repairs" />
        <StatCard label="Net Revenue" value={`₱${Number(stats.netRevenue || 0).toFixed(2)}`} icon={<TrendingUp size={24} />} color="green" trend="After refunds" />
        <StatCard label="Total Orders" value={stats.totalOrders || 0} icon={<ShoppingCart size={24} />} color="blue" trend="All orders" />
        <StatCard label="Outstanding" value={`₱${Number(stats.outstandingBalances || 0).toFixed(2)}`} icon={<DollarSign size={24} />} color="amber" trend="Unpaid balances" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Repair Revenue" value={`₱${Number(stats.repairServiceRevenue || 0).toFixed(2)}`} icon={<Wrench size={24} />} color="navy" />
        <StatCard label="Walk-in Revenue" value={`₱${Number(stats.walkInRevenue || 0).toFixed(2)}`} icon={<Users size={24} />} color="blue" />
        <StatCard label="Online Revenue" value={`₱${Number(stats.onlineRevenue || 0).toFixed(2)}`} icon={<Package size={24} />} color="green" />
        <StatCard label="Total Refunds" value={`₱${Number(stats.totalRefunds || 0).toFixed(2)}`} icon={<TrendingUp size={24} />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment method breakdown */}
        <Card className="p-5">
          <h3 className="font-bold text-navy mb-4">Payment Methods</h3>
          {Object.keys(pm).length === 0 ? <p className="text-slate-400 text-sm">No payments yet.</p> : (
            <div className="space-y-3">
              {Object.entries(pm).map(([method, amt]: any) => (
                <div key={method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{method}</span>
                    <span className="font-semibold text-navy">₱{Number(amt).toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-navy to-brandgreen rounded-full transition-all" style={{ width: `${(Number(amt) / pmTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Low stock alerts */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Low Stock Alerts</h3>
            <button onClick={() => nav("/admin/products")} className="text-sm text-navy font-medium hover:underline">View all</button>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-slate-400 text-sm">All products well stocked.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-50">
                  <span className="min-w-0 text-sm text-slate-700 break-words">{p.productName}</span>
                  <span className="shrink-0 text-xs font-bold text-amber-700">{p.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="p-5">
          <h3 className="font-bold text-navy mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "Manage Repairs", path: "/admin/repairs", icon: Wrench },
              { label: "Manage Orders", path: "/admin/orders", icon: ShoppingCart },
              { label: "Refunds", path: "/admin/refunds", icon: TrendingUp },
              { label: "Revenue Reports", path: "/admin/reports", icon: DollarSign },
              { label: "Customer Reviews", path: "/admin/reviews", icon: Package },
            ].map((q) => (
              <button key={q.label} onClick={() => nav(q.path)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left group">
                <div className="w-9 h-9 rounded-lg bg-navy/10 text-navy flex items-center justify-center"><q.icon size={16} /></div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-navy">{q.label}</span>
                <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-navy" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy">Recent Orders</h3>
            <button onClick={() => nav("/admin/orders")} className="text-sm text-navy font-medium hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></button>
          </div>
          {loading ? <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div> :
            orders.length === 0 ? <p className="text-slate-400 text-sm">No orders yet.</p> : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-navy break-words">{o.orderNumber}</div>
                      <div className="text-xs text-slate-500 break-words">{o.customerName || "Customer"} · ₱{Number(o.totalAmount).toFixed(2)}</div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${o.orderStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : o.orderStatus === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {o.orderStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </Card>

        {/* Recent repairs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy">Recent Repairs</h3>
            <button onClick={() => nav("/admin/repairs")} className="text-sm text-navy font-medium hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></button>
          </div>
          {loading ? <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div> :
            repairs.length === 0 ? <p className="text-slate-400 text-sm">No repairs yet.</p> : (
              <div className="space-y-2">
                {repairs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-navy break-words">{r.referenceNumber}</div>
                      <div className="text-xs text-slate-500 break-words">{r.deviceType} {r.brand} · {r.transactionSource}</div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${r.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : r.status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>
    </div>
  );
};
