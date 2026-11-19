import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Users, Wrench, Package, ShoppingCart, RotateCcw, CreditCard, History, Star, BarChart3, Settings, LogOut, Menu, ChevronRight, User } from "lucide-react";
import logo from "../../../assets/logo.png";
import { mediaUrl } from "../../../lib/media";

const items = [
  { to: "/admin", label: "Dashboard Overview", icon: LayoutDashboard },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/walkins", label: "Repairs & Walk-Ins", icon: Wrench },
  { to: "/admin/products", label: "Products & Inventory", icon: Package },
  { to: "/admin/billing", label: "Billing & Invoices", icon: CreditCard },
  { to: "/admin/refunds", label: "Refunds & Cancellations", icon: RotateCcw },
  { to: "/admin/reports", label: "Revenue Reports", icon: BarChart3 },
  { to: "/admin/reviews", label: "Customer Reviews", icon: Star },
  { to: "/admin/profile", label: "My Profile", icon: User },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isItemActive = (path: string) => {
    const p = location.pathname;
    if (path === "/admin") return p === "/admin";
    return p === path || p.startsWith(path + "/");
  };
  const Sidebar = (
    <aside className="w-64 bg-gradient-to-b from-navy-dark to-navy text-white flex flex-col h-full">
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <img src={logo} alt="CP TechFix Logo" className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1" />
        <div>
          <div className="font-bold leading-tight">CP TechFix</div>
          <div className="text-xs text-white/60">Admin Console</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {items.map((it) => {
          const active = isItemActive(it.to);
          return (
            <Link key={it.to} to={it.to} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-white/15 text-white shadow" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
              <it.icon size={18} className={active ? "text-emerald-300" : ""} /> {it.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-300" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-brandgreen overflow-hidden flex items-center justify-center font-bold shrink-0">
            {user?.profileImage ? <img src={mediaUrl(user.profileImage)} alt={user.fullName} className="w-full h-full object-cover" /> : (user?.fullName?.[0] || "A")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.fullName}</div>
            <div className="text-xs text-white/60 truncate">{user?.role}</div>
          </div>
        </div>
        <button onClick={() => { logout(); nav("/login"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="hidden md:block">{Sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">{Sidebar}</div>
        </div>
      )}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="font-semibold text-navy flex items-center gap-2">
            <img src={logo} alt="CP TechFix Logo" className="w-7 h-7 object-contain" />
            Admin Console
          </div>
          <Link to="/admin/profile" title="My profile" className="w-9 h-9 rounded-full bg-navy text-white overflow-hidden flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-brandgreen transition">
            {user?.profileImage ? <img src={mediaUrl(user.profileImage)} alt={user.fullName} className="w-full h-full object-cover" /> : (user?.fullName?.[0] || "A")}
          </Link>
        </header>
        <div className="p-4 md:p-6 fade-in"><Outlet /></div>
      </main>
    </div>
  );
};
