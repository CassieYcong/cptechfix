import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../components/context/AuthContext";
import { Input, Button } from "../components/ui";
import { SuccessModal, ErrorModal } from "../components/ui/Modal";
import { Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import logo from "../assets/logo.png";
import api from "../lib/axios";

const Logo = () => (
  <div className="flex flex-col items-center">
    <img src={logo} alt="CP TechFix Logo" className="w-24 h-24 object-contain mb-4" />
    <span className="text-2xl font-bold text-white tracking-wide">CP TechFix</span>
  </div>
);

const GeometricBg = () => (
  <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 800 600">
    <polygon points="0,0 200,0 100,150" fill="#1e3a8a" opacity="0.4" />
    <polygon points="600,0 800,0 800,200" fill="#1d4ed8" opacity="0.3" />
    <polygon points="0,400 150,600 0,600" fill="#0f172a" opacity="0.5" />
    <polygon points="650,400 800,350 800,600" fill="#1e3a8a" opacity="0.35" />
    <polygon points="300,200 450,150 500,300 350,350" fill="#2563eb" opacity="0.15" />
    <polygon points="100,300 250,250 300,400 150,450" fill="#00f076" opacity="0.08" />
  </svg>
);

const SplitLayout: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
    <div className="relative hidden md:flex flex-col items-center justify-center bg-[#070d1a] text-white p-10 overflow-hidden">
      <GeometricBg />
      <div className="relative z-10 text-center">
        <Logo />
        <h2 className="text-3xl font-bold mt-6 mb-2">{title}</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">{subtitle}</p>
      </div>
    </div>
    <div className="flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md p-8">
        {children}
      </div>
    </div>
  </div>
);

const fieldClass = "w-full bg-white border border-[#e2e8f0] rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 focus:border-[#1d4ed8] transition";

const IconField: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
    {children}
  </div>
);

// ---------- Login ----------
export const Login: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setErr("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setErr("Please enter a valid email address."); return; }
    if (!password) { setErr("Password is required."); return; }
    setLoading(true);
    try {
      const u = await login(trimmedEmail, password);
      setSuccess(true);
      setTimeout(() => nav(u.role === "CUSTOMER" ? "/dashboard" : "/admin"), 700);
    } catch (e: any) {
      if (!e?.response) {
        setErr("Network error. Please check your connection and try again.");
      } else {
        const data = e.response.data;
        let msg = data?.message || "Invalid credentials";
        if (msg === "Validation error") {
          const flat = Object.values(data?.errors?.fieldErrors || {}).flat();
          msg = (flat[0] as string) || "Please check your input.";
        }
        setErr(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <>
      <SplitLayout title="Log-in Your Account" subtitle="CP TechFix and get the best service.">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="CP TechFix Logo" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Welcome Back!</h2>
          <p className="text-slate-500 text-sm mt-1">Login to your account to continue.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <IconField icon={<Mail size={18} />}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter your email"
              className={fieldClass} />
          </IconField>
          <IconField icon={<Lock size={18} />}>
            <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password"
              className={fieldClass + " pr-10"} />
            <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1d4ed8]">
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </IconField>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded" /> Remember me</label>
            <Link to="/forgot-password" className="text-[#1d4ed8] font-medium hover:underline">Forgot password?</Link>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-[#1d4ed8] text-white font-semibold hover:bg-[#1e40af] transition shadow-lg shadow-blue-600/30 disabled:opacity-50">
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-600 space-y-2">
          <div>Don't have an account? <Link to="/register" className="text-[#1d4ed8] font-semibold hover:underline">Create Account</Link></div>
          <div><Link to="/admin/login" className="text-slate-500 hover:text-[#1d4ed8] transition">Admin Log in</Link></div>
        </div>
      </SplitLayout>
      <SuccessModal open={success} onClose={() => setSuccess(false)} message="Login successful" />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </>
  );
};

// ---------- Register ----------
export const Register: React.FC = () => {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = React.useState({ fullName: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    if (!form.fullName.trim()) { setErr("Full name is required."); return; }
    if (!form.email.trim()) { setErr("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setErr("Please enter a valid email address."); return; }
    if (form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirmPassword) { setErr("Passwords must match."); return; }
    setLoading(true);
    try {
      await register({ ...form, email: form.email.trim(), fullName: form.fullName.trim() });
      setSuccess(true);
      setTimeout(() => nav("/dashboard"), 700);
    } catch (e: any) {
      if (!e?.response) {
        setErr("Network error. Please check your connection and try again.");
      } else {
        const data = e.response.data;
        let msg = data?.message || "Registration failed";
        if (msg === "Validation error") {
          const flat = Object.values(data?.errors?.fieldErrors || {}).flat();
          msg = (flat[0] as string) || "Please check your input.";
        }
        setErr(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <>
      <SplitLayout title="User Register" subtitle="Join CP TechFix and get the best service.">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="CP TechFix Logo" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Create Account</h2>
          <p className="text-slate-500 text-sm mt-1">Join CP TechFix today.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <IconField icon={<User size={18} />}>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required placeholder="Enter your full name" className={fieldClass} />
          </IconField>
          <IconField icon={<Mail size={18} />}>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="Enter your email" className={fieldClass} />
          </IconField>
          <IconField icon={<Phone size={18} />}>
            <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="Enter your phone number" className={fieldClass} />
          </IconField>
          <IconField icon={<Lock size={18} />}>
            <input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Enter your password" className={fieldClass + " pr-10"} />
            <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1d4ed8]">
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </IconField>
          <IconField icon={<Lock size={18} />}>
            <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required placeholder="Confirm your password" className={fieldClass + " pr-10"} />
            <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1d4ed8]">
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </IconField>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-[#1d4ed8] text-white font-semibold hover:bg-[#1e40af] transition shadow-lg shadow-blue-600/30 disabled:opacity-50">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-[#1d4ed8] font-semibold hover:underline">Login</Link>
        </div>
      </SplitLayout>
      <SuccessModal open={success} onClose={() => setSuccess(false)} message="Registration successful" />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </>
  );
};

// ---------- Admin Login ----------
export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setErr("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setErr("Please enter a valid email address."); return; }
    if (!password) { setErr("Password is required."); return; }
    setLoading(true);
    try {
      const u = await login(trimmedEmail, password);
      if (u.role === "CUSTOMER") {
        setErr("This portal is for staff and administrators only.");
        return;
      }
      setSuccess(true);
      setTimeout(() => nav("/admin"), 700);
    } catch (e: any) {
      if (!e?.response) {
        setErr("Network error. Please check your connection and try again.");
      } else {
        const data = e.response.data;
        let msg = data?.message || "Invalid credentials";
        if (msg === "Validation error") {
          const flat = Object.values(data?.errors?.fieldErrors || {}).flat();
          msg = (flat[0] as string) || "Please check your input.";
        }
        setErr(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <>
      <SplitLayout title="Admin Portal" subtitle="Sign in to manage your CUSTOMERS">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="CP TechFix Logo" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Admin</h2>
          <p className="text-slate-500 text-sm mt-1">Login to your account to continue.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <IconField icon={<Mail size={18} />}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter your email" className={fieldClass} />
          </IconField>
          <IconField icon={<Lock size={18} />}>
            <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" className={fieldClass + " pr-10"} />
            <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1d4ed8]">
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </IconField>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded" /> Remember me</label>
            <Link to="/forgot-password" className="text-[#1d4ed8] font-medium hover:underline">Forgot password?</Link>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-[#1d4ed8] text-white font-semibold hover:bg-[#1e40af] transition shadow-lg shadow-blue-600/30 disabled:opacity-50">
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="text-slate-500 hover:text-[#1d4ed8] transition">Customer login instead</Link>
        </div>
      </SplitLayout>
      <SuccessModal open={success} onClose={() => setSuccess(false)} message="Login successful" />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </>
  );
};

export const ForgotPassword: React.FC = () => {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => nav("/login"), 1500);
    return () => clearTimeout(t);
  }, [success, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErr("Please enter your email address."); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (e: any) {
      setErr(e.response?.data?.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="CP TechFix Logo" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a] mb-2 text-center">Forgot Password</h2>
          <p className="text-slate-600 text-center text-sm">Enter your email address and we will send you a link to reset your password.</p>

          <form onSubmit={submit} className="mt-6">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <div className="text-center mt-5">
            <Link to="/login" className="text-sm text-[#1d4ed8] font-medium hover:underline">Back to Login</Link>
          </div>
        </div>
      </div>

      <SuccessModal
        open={success}
        onClose={() => { setSuccess(false); nav("/login"); }}
        title="Email Sent"
        message="If the email exists, a password reset link has been sent. Redirecting to login..."
      />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </>
  );
};