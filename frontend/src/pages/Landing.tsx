import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/context/AuthContext";
import { useCart } from "../components/context/CartContext";
import api from "../lib/axios";
import { LoginRequiredModal, Modal } from "../components/ui/Modal";
import {
  Wrench, ShoppingBag, ArrowRight, ChevronRight, ShieldCheck, Database, Cpu, Monitor,
  MapPin, Phone, Mail, Clock, Facebook, Twitter, Instagram, Linkedin, Star, CheckCircle2, Eye,
} from "lucide-react";
import { Button } from "../components/ui";
import heroBanner from "../assets/hero-banner.png";
import logo from "../assets/logo.png";

export const Landing: React.FC = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { refresh } = useCart();
  const products = [
    { name: "Samsung 500 EVO M.2 NVMe SSD", price: "₱1,560", img: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80" },
    { name: "Logitech G PRO X Superlight Mouse", price: "₱1,000", img: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80" },
    { name: "Razer Huntsman Mini Keyboard - Koglaised", price: "₱11,900", img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80" },
  ];
  const [bestProducts, setBestProducts] = React.useState<any[]>([]);
  const [productStats, setProductStats] = React.useState<Record<string, any>>({});
  const [productReviews, setProductReviews] = React.useState<any[]>([]);
  const [loginModal, setLoginModal] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [selected, setSelected] = React.useState<any>(null);
  const [reviewForm, setReviewForm] = React.useState({ rating: 5, comment: "" });
  const [reviewSubmitted, setReviewSubmitted] = React.useState(false);
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [reviewMessage, setReviewMessage] = React.useState("");
  const viewCountedRef = React.useRef<Set<string>>(new Set());
  const navItems = React.useMemo(() => ([
    { id: "home", label: "Home" },
    { id: "services", label: "Services" },
    { id: "accessories", label: "Accessories" },
    { id: "about", label: "About Us" },
    { id: "contact", label: "Contact" },
  ]), []);
  const [active, setActive] = React.useState("home");
  const isClickingRef = React.useRef(false);
  const navContainerRef = React.useRef<HTMLDivElement>(null);
  const linkRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({});
  const [underline, setUnderline] = React.useState({ left: 0, width: 0 });

  const loadStats = async () => {
    try {
      const r = await api.get("/reviews/product-stats");
      const map: Record<string, any> = {};
      for (const s of r.data || []) map[s.productId] = s;
      setProductStats(map);
    } catch {}
  };

  React.useEffect(() => {
    (async () => {
      try { const r = await api.get("/products"); setBestProducts(r.data); } catch {}
      await loadStats();
    })();
  }, []);

  const openDetails = async (p: any) => {
    setSelected(p);
    setProductReviews([]);
    setReviewForm({ rating: 5, comment: "" });
    setReviewSubmitted(false);
    setReviewMessage("");
    // Count view once per product per load
    const found = bestProducts.find((bp) => bp.productName?.toLowerCase() === p.name?.toLowerCase());
    const pid = found?.id || p.id;
    if (pid && !viewCountedRef.current.has(pid)) {
      viewCountedRef.current.add(pid);
      try {
        const r = await api.post(`/products/${pid}/views`, {});
        const views = r.data?.viewsCount;
        setBestProducts((prev) => prev.map((bp) => (bp.id === pid ? { ...bp, viewsCount: views } : bp)));
      } catch {}
    }
    if (pid) {
      try {
        const r = await api.get(`/reviews/product/${pid}`);
        setProductReviews(r.data || []);
      } catch {}
    }
  };

  // Track which section is currently in view.
  React.useEffect(() => {
    const sections = navItems.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickingRef.current) return;
        // Pick the entry with the largest intersection ratio that is intersecting.
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const top = visible.reduce((a, b) => (a.intersectionRatio >= b.intersectionRatio ? a : b));
        const id = top.target.id;
        if (id) setActive(id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [navItems]);

  // Move the sliding underline to the active link.
  const measureUnderline = React.useCallback(() => {
    const container = navContainerRef.current;
    const link = linkRefs.current[active];
    if (!container || !link) return;
    const cRect = container.getBoundingClientRect();
    const lRect = link.getBoundingClientRect();
    setUnderline({ left: lRect.left - cRect.left, width: lRect.width });
  }, [active]);

  React.useEffect(() => {
    measureUnderline();
    const onResize = () => measureUnderline();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureUnderline]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    isClickingRef.current = true;
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => { isClickingRef.current = false; }, 900);
  };
  const go = (path: string) => nav(user ? path : "/login");

  const services = [
    { badge: "Warranty 1 Hour", title: "Computer & Laptop Repair", desc: "Complete hardware diagnostics for desktop & laptops, screen replacements, battery replacements, and root-cause component-level recovery.", icon: Monitor },
    { badge: "Quality Assured", title: "Screen Replacement", desc: "High-grade OEM display replacements for MacBook, ThinkPad, & Windows laptops with correct panels, true color calibration, and flawless finish.", icon: ShieldCheck },
    { badge: "Secure & Private", title: "Advanced Data Recovery", desc: "Complete data backup, hard drive recovery for accidental deletion, virus attacks, lost enterprise documents, photos, and uncorrupted drive recovery.", icon: Database },
    { badge: "Certified Upgrades", title: "Hardware Upgrades", desc: "Professionally upgrade the RAM, switch from HDD to fast SSD storage, CPU upgrades, and custom cooling systems.", icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-[#070d1a] text-slate-200 font-sans antialiased">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#080d21]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="CP TechFix Logo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-white text-xl tracking-tight">CP TechFix</span>
          </div>
          <div ref={navContainerRef} className="relative hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
             <span aria-hidden="true" className="pointer-events-none absolute bottom-0 h-0.5 bg-emerald-400 transition-all duration-300 ease-out" style={{ left: underline.left, width: underline.width }} />
            {navItems.map((item) => ( <a key={item.id} ref={(el) => { linkRefs.current[item.id] = el; }} href={`#${item.id}`} onClick={(e) => handleNavClick(e, item.id)} className={`relative pb-1 transition-colors ${active === item.id ? "text-emerald-400 font-medium" : "text-slate-300 hover:text-white"}`}>{item.label}</a> ))}
            
            
            
            
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => nav("/register")} className="px-5 py-2 rounded-lg bg-emerald-400 text-[#070d1a] font-bold text-sm hover:bg-emerald-300 transition shadow-[0_0_20px_rgba(0,240,118,0.3)]">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Full Image Background & Enhanced Exact Text Colors */}
      <section id="home" className="relative w-full min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
        {/* Full Image Background Container */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBanner}
            alt="CPTechFix Background Setup"
            className="w-full h-full object-cover object-center"
          />
          {/* Smooth Dark Gradient Fade Overlay at the Bottom */}
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#070d1a] via-[#070d1a]/80 to-transparent pointer-events-none" />
        </div>

        {/* Scaled Floating Content Overlay */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full py-12">
          <div className="max-w-2xl space-y-8">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08]">
              <span className="text-[#00a859] block mb-1">
                Fast <span className="text-[#1a365d]">&amp;</span> Reliable
              </span>
              <span className="text-[#1a365d] block mb-1">Computer Repair</span>
              <span className="text-[#1a365d] block">and Accessories</span>
            </h1>

            <p className="text-slate-700 text-xl sm:text-2xl font-semibold">
              We fix your devices, so you stay connected.
            </p>

            <div className="flex flex-wrap gap-5 pt-2">
              <button
                onClick={() => nav("/dashboard/repair-request")}
                className="px-8 py-4 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-500/25 transition-all text-base sm:text-lg flex items-center gap-3"
              >
                <Wrench size={22} /> Request a Repair
              </button>

              <button
                onClick={() => nav("/dashboard/shop")}
                className="px-8 py-4 bg-slate-200/90 hover:bg-slate-300 text-slate-900 font-bold rounded-xl border border-slate-400/50 backdrop-blur transition-all text-base sm:text-lg flex items-center gap-3"
              >
                <ShoppingBag size={22} /> Shop Accessories
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-[#0b1329]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Professional Repair</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-3">Our Professional Repair Services</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">From simple screen fixes to complex motherboard soldering and custom water-cooled desktop builds, we fix it all with precision.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((s) => (
              <div key={s.title} className="bg-[#111c38] border border-white/5 rounded-2xl p-6 hover:border-emerald-400/30 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
                  <s.icon size={24} />
                </div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded mb-3">{s.badge}</span>
                <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{s.desc}</p>
                <button onClick={() => nav("/login")} className="text-emerald-400 text-sm font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Contact us <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accessories */}
      <section id="accessories" className="py-20 bg-[#070d1a]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Best Products</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-3">Our BEST SELLERS Accessories</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Top-rated peripherals, storage, and custom components, tested to last and perform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const found = bestProducts.find((bp) => bp.productName?.toLowerCase() === p.name?.toLowerCase());
              const views = found?.viewsCount ?? 0;
              const stat = found ? productStats[found.id] : undefined;
              const avg = stat ? stat.avgRating : 0;
              const total = stat ? stat.totalReviews : 0;
              return (
              <div key={p.name} className="bg-[#111c38] border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-400/30 transition-all duration-300 group">
                <div className="h-52 bg-[#162244] overflow-hidden">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="text-white font-semibold mb-2">{p.name}</h3>
                  <div className="text-slate-400 text-xs mb-1">{found ? (found.stock > 0 ? "In Stock" : "Out of Stock") : "Available"}</div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1"><Eye size={14} /> {views} Views</span>
                    <span className="flex items-center gap-1"><Star size={14} className="text-amber-400" fill="currentColor" /> {avg ? Number(avg).toFixed(1) : "—"} ({total} Reviews)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold text-xl">{p.price}</span>
                    <button onClick={() => openDetails(p)} className="px-4 py-2 rounded-lg bg-emerald-400 text-[#070d1a] font-bold text-sm hover:bg-emerald-300 transition shadow-[0_0_15px_rgba(0,240,118,0.25)]">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About / Trust */}
      <section id="about" className="py-20 bg-[#0b1329]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">About Us</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">Your Trusted Local Tech Repair Experts</h2>
            <p className="text-slate-400 leading-relaxed mb-8">This is a specialized local shop providing top-tier hardware diagnostic fixes, fast screen replacements, motherboard repair, data recovery, and installation services with a warranty, verified service guarantee, and 100% client satisfaction.</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { n: "2,500+", l: "Device Repairs" },
                { n: "8", l: "Years Experience" },
                { n: "98%", l: "Customer Satisfaction" },
              ].map((s) => (
                <div key={s.l} className="bg-[#111c38] border border-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-extrabold text-emerald-400">{s.n}</div>
                  <div className="text-xs text-slate-400 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/30 text-emerald-400 text-sm font-semibold">
              <ShieldCheck size={16} /> Verified
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
              <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=900&q=80" alt="hardware" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-[#070d1a]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Get In Touch</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-3">Contact Us</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Have a question or a broken device? Drop us a message and we'll get back to you. Single-visit fast-track ticketing.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#111c38] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-emerald-400 mt-1" size={20} />
                <div>
                  <div className="text-white font-semibold">Address</div>
                  <div className="text-slate-400 text-sm">123 Tech Drive, Guezoe City, Philippines</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="text-emerald-400 mt-1" size={20} />
                <div>
                  <div className="text-white font-semibold">Phone</div>
                  <div className="text-slate-400 text-sm">+63 123 456 5770</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="text-emerald-400 mt-1" size={20} />
                <div>
                  <div className="text-white font-semibold">Email</div>
                  <div className="text-slate-400 text-sm">info@cptechfix.com</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="text-emerald-400 mt-1" size={20} />
                <div>
                  <div className="text-white font-semibold">Business Hours</div>
                  <div className="text-slate-400 text-sm">Monday-Sunday, 8:00 AM - 6:00 PM</div>
                </div>
              </div>
            </div>
            <form className="bg-[#111c38] border border-white/5 rounded-2xl p-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input placeholder="Full Name" className="w-full bg-[#162244] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40" />
                <input placeholder="Email" type="email" className="w-full bg-[#162244] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input placeholder="Phone Number" className="w-full bg-[#162244] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40" />
                <input placeholder="Subject" className="w-full bg-[#162244] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40" />
              </div>
              <textarea placeholder="Message (Tell us about your device and the issue...)" rows={4} className="w-full bg-[#162244] border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40" />
              <button type="submit" className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition shadow-lg shadow-blue-600/30">
                Submit
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Product Details Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Product Details" size="max-w-lg">
        {selected && (() => {
          const found = bestProducts.find((bp) => bp.productName.toLowerCase() === selected.name.toLowerCase());
          const avail = found ? (found.stock > 0 ? `Available (${found.stock} in stock)` : "Out of Stock") : "Available";
          return (
            <div className="space-y-4">
              <div className="h-52 rounded-xl overflow-hidden bg-slate-100">
                <img src={selected.img} alt={selected.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-xl font-bold text-navy">{selected.name}</div>
                <div className="text-slate-600 text-sm mt-1">{found?.description || "High-quality accessory tested to last and perform. See Shop page for full specifications."}</div>
                {found?.category && <div className="text-xs text-slate-500 mt-1">{found.category}{found.brand ? ` · ${found.brand}` : ""}</div>}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-extrabold text-brandgreen">{selected.price}</div>
                <div className={`text-sm font-medium ${found && found.stock <= 0 ? "text-red-500" : "text-slate-500"}`}>{avail}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Eye size={14} /> {found?.viewsCount ?? 0} Views</span>
                {found && productStats[found.id] && <span className="flex items-center gap-1"><Star size={14} className="text-amber-400" fill="currentColor" /> {Number(productStats[found.id].avgRating || 0).toFixed(1)} ({productStats[found.id].totalReviews} Reviews)</span>}
              </div>


              {/* Reviews & Ratings */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-navy">Customer Reviews</h4>
                {(() => {
                  const stat = found ? productStats[found.id] : undefined;
                  const avg = stat ? Number(stat.avgRating || 0) : 0;
                  const total = stat ? stat.totalReviews : 0;
                  return (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} fill={avg >= n ? "currentColor" : "none"} />)}
                        </div>
                        <span className="text-sm font-semibold text-navy">{avg ? avg.toFixed(1) : "—"}/5</span>
                        <span className="text-xs text-slate-500">({total} Reviews)</span>
                      </div>
                      <div className="mt-3 space-y-3 max-h-52 overflow-y-auto">
                        {productReviews.length === 0 && <p className="text-sm text-slate-400">No reviews yet.</p>}
                        {productReviews.map((r: any) => (
                          <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">{r.user?.fullName || "Customer"}</span>
                              <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-400 mt-1">
                              {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} fill={r.rating >= n ? "currentColor" : "none"} />)}
                            </div>
                            <p className="text-sm text-slate-700 mt-1 break-words">{r.comment}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        {reviewSubmitted ? (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-500 flex items-center justify-center">
                              <CheckCircle2 size={24} className="text-white" />
                            </div>
                            <div className="font-bold text-emerald-700">Review submitted successfully!</div>
                            <p className="text-xs text-emerald-600 mt-1">Your review is now pending admin approval and will appear once approved. Thank you for your feedback!</p>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => { setReviewSubmitted(false); setReviewForm({ rating: 5, comment: "" }); }} className="flex-1 py-2 rounded-lg border border-emerald-300 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition">Write Another</button>
                              <button onClick={() => setSelected(null)} className="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition">Close</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-semibold text-sm text-slate-700 mb-2">Write a Review</div>
                            <div className="flex gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: n })} className={n <= reviewForm.rating ? "text-amber-400" : "text-slate-300"}>
                                  <Star size={20} fill={n <= reviewForm.rating ? "currentColor" : "none"} />
                                </button>
                              ))}
                            </div>
                            <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="Write your review..." rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            {reviewMessage && <p className="text-xs text-amber-600 mt-1">{reviewMessage}</p>}
                            <button
                              disabled={submittingReview}
                              onClick={async () => {
                                if (!user || !localStorage.getItem("token")) { setLoginModal(true); return; }
                                if (!reviewForm.rating) { setReviewMessage("Select a rating"); return; }
                                if (!reviewForm.comment.trim()) { setReviewMessage("Write a comment"); return; }
                                if (!found) return;
                                setSubmittingReview(true);
                                setReviewMessage("");
                                try {
                                  await api.post(`/reviews/product/${found.id}`, { rating: reviewForm.rating, comment: reviewForm.comment.trim() });
                                  const r = await api.get(`/reviews/product/${found.id}`);
                                  setProductReviews(r.data || []);
                                  await loadStats();
                                  setReviewSubmitted(true);
                                } catch (e: any) {
                                  if (e.response?.status === 401) setLoginModal(true);
                                  else setReviewMessage(e.response?.data?.message || "Failed to submit review");
                                } finally { setSubmittingReview(false); }
                              }}
                              className="mt-2 w-full py-2 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submittingReview ? "Submitting..." : "Submit Review"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Footer */}
      <LoginRequiredModal open={loginModal} onClose={() => setLoginModal(false)} message="Please sign in or create an account to add products to your cart." />
      {msg && <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">{msg}</div>}
      <footer className="bg-[#0b1329] border-t border-white/5 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="CP TechFix Logo" className="w-9 h-9 object-contain" />
                <span className="font-bold text-white text-lg">CP TechFix</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">CP TechFix provides top-tier technical repair and maintenance services for businesses and individuals seeking quality and speed.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {["Home", "Services", "Accessories", "About Us", "Terms"].map((l) => (
                  <li key={l}><a href="#" className="hover:text-emerald-400 transition">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>123 Tech Drive, Guezoe City, Philippines</li>
                <li>+63 123 456 5770</li>
                <li>info@cptechfix.com</li>
                <li>Monday-Sunday 8:00 AM - 6:00 PM</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-3">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-lg bg-[#111c38] border border-white/5 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-400/30 transition">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 text-center text-sm text-slate-500">
            © 2026 CP TechFix. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};