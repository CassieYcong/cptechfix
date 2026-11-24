import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { LayoutDashboard, Wrench, ShoppingBag, ShoppingCart, Package, ClipboardList, CreditCard, Star, User, LogOut, Menu, X, ChevronRight } from "lucide-react";
import logo from "../../../assets/logo.png";
import { mediaUrl } from "../../../lib/media";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/repairs", label: "Repair Services", icon: Wrench },
  { to: "/accessories", label: "Accessories", icon: ShoppingBag },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/orders", label: "My Orders", icon: Package },
  { to: "/tracking", label: "Tracking", icon: ClipboardList },
  { to: "/billing", label: "Billing History", icon: CreditCard },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/profile", label: "Profile", icon: User },
];

export const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isItemActive = (path: string) => {
    const p = location.pathname;
    if (path === "/dashboard") return p === "/dashboard" || p === "/";
    if (path === "/repairs") return p.startsWith("/repair") || p.startsWith("/dashboard/repair");
    if (path === "/accessories") return p.startsWith("/access") || p.startsWith("/dashboard/shop") || p.startsWith("/product") || p.startsWith("/cart") || p.startsWith("/checkout") || p.startsWith("/shop");
    if (path === "/orders") return p.startsWith("/order");
    if (path === "/tracking") return p === "/tracking";
    if (path === "/billing") return p.startsWith("/billing");
    if (path === "/reviews") return p.startsWith("/review");
    if (path === "/profile") return p.startsWith("/profile");
    return p === path || p.startsWith(path + "/");
  };
  const Sidebar = (
    <aside className="w-64 bg-gradient-to-b from-navy-dark to-navy text-white flex flex-col h-full">
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <img src={logo} alt="CP TechFix Logo" className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1" />
        <div>
          <div className="font-bold leading-tight">CP TechFix</div>
          <div className="text-xs text-white/60">Customer Portal</div>
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
            {user?.profileImage ? <img src={mediaUrl(user.profileImage)} alt={user.fullName} className="w-full h-full object-cover" /> : (user?.fullName?.[0] || "U")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.fullName}</div>
            <div className="text-xs text-white/60 truncate">{user?.email}</div>
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
      <div className="hidden md:block md:sticky md:top-0 md:h-dvh md:shrink-0">{Sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">{Sidebar}</div>
        </div>
      )}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="font-semibold text-navy flex min-w-0 items-center gap-2">
            <img src={logo} alt="CP TechFix Logo" className="w-7 h-7 shrink-0 object-contain" />
            <span className="min-w-0 break-words">Welcome, {user?.fullName?.split(" ")[0] || "Guest"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={() => nav("/cart")} className="relative p-2 rounded-lg hover:bg-slate-100">
              <ShoppingCart size={20} className="text-navy" />
              {count > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brandgreen text-white text-xs flex items-center justify-center font-bold">{count}</span>}
            </button>
            <button onClick={() => nav("/profile")} title="My profile" className="w-9 h-9 rounded-full bg-navy text-white overflow-hidden flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-brandgreen transition">
              {user?.profileImage ? <img src={mediaUrl(user.profileImage)} alt={user.fullName} className="w-full h-full object-cover" /> : (user?.fullName?.[0] || "G")}
            </button>
          </div>
        </header>
        <div className="p-4 md:p-6 fade-in"><Outlet /></div>
      </main>
    </div>
  );
};
