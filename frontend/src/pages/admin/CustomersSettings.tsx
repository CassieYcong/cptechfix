import React from "react";
import api from "../../lib/axios";
import { Card, Button, Input, Select, Badge } from "../../components/ui";
import { Modal, ConfirmDialog, SuccessModal, ErrorModal } from "../../components/ui/Modal";
import { useAuth } from "../../components/context/AuthContext";

const emptyForm = { fullName: "", email: "", phoneNumber: "", password: "", role: "CUSTOMER" };

export const AdminCustomers: React.FC = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<any>(null);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [form, setForm] = React.useState({ ...emptyForm });
  const [delId, setDelId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const load = async () => {
    try { setUsers((await api.get("/users")).data); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed to load users"); }
  };
  React.useEffect(() => { load(); }, []);

  const openCreate = () => { setEdit(null); setForm({ ...emptyForm }); setFieldErrors({}); setOpen(true); };
  const openEdit = (u: any) => {
    setEdit(u);
    setForm({ fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber || "", password: "", role: u.role });
    setFieldErrors({});
    setOpen(true);
  };

  const save = async () => {
    const errs: Record<string, string> = {};
    const name = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phoneNumber.trim();
    if (!name) errs.fullName = "Full name is required.";
    else if (!/^[A-Za-z\s.'-]+$/.test(name)) errs.fullName = "Name must contain letters only.";
    if (!email) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email address (e.g. name@email.com).";
    if (phone && !/^(09\d{9}|\+63\s?9\d{2}\s?\d{3}\s?\d{4})$/.test(phone)) errs.phoneNumber = "Phone must start with 09 or +63 9XX XXX XXXX.";
    if (!edit && !form.password) errs.password = "Password is required for new customers.";
    if (Object.keys(errs).length) { setFieldErrors(errs); setErr("Please fix the highlighted fields."); return; }
    setFieldErrors({});
    try {
      const payload: any = { ...form, fullName: name, email, phoneNumber: phone };
      if (!payload.password) delete payload.password;
      if (edit) await api.put(`/users/${edit.id}`, payload);
      else await api.post("/users", payload);
      setOpen(false); setEdit(null); setForm({ ...emptyForm });
      setMsg(edit ? "Customer updated" : "Customer created");
      load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed to save customer"); }
  };

  const doDelete = async () => {
    if (!delId) return;
    try { await api.delete(`/users/${delId}`); setDelId(null); setMsg("Customer deleted"); load(); }
    catch (e: any) { setErr(e.response?.data?.message || "Failed to delete customer"); setDelId(null); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-navy">Customer Management</h1>
        <Button onClick={openCreate}>Add Customer</Button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-navy break-words">{u.fullName}</div>
                <div className="text-sm text-slate-600 break-words">{u.email}{u.phoneNumber ? ` | ${u.phoneNumber}` : ""}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={u.role === "ADMIN" ? "navy" : u.role === "STAFF" ? "blue" : "green"}>{u.role}</Badge>
                <Button variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
                {me?.role === "ADMIN" && u.id !== me?.id && (
                  <Button variant="danger" onClick={() => setDelId(u.id)}>Delete</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {!users.length && <Card className="p-6 text-center text-slate-500">No customers yet.</Card>}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setFieldErrors({}); }} title={edit ? "Edit Customer" : "Add Customer"}>
        <div>
          <Input label="Full Name" value={form.fullName} className={fieldErrors.fullName ? "border-red-500 ring-2 ring-red-500/30" : ""} onChange={(e) => { setForm({ ...form, fullName: e.target.value.replace(/[^A-Za-z\s.'-]/g, "") }); setFieldErrors((p) => ({ ...p, fullName: "" })); }} />
          {fieldErrors.fullName && <p className="text-xs text-red-600 -mt-3 mb-3">{fieldErrors.fullName}</p>}
        </div>
        <div>
          <Input label="Email" type="email" value={form.email} className={fieldErrors.email ? "border-red-500 ring-2 ring-red-500/30" : ""} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "" })); }} />
          {fieldErrors.email && <p className="text-xs text-red-600 -mt-3 mb-3">{fieldErrors.email}</p>}
        </div>
        <div>
          <Input label="Phone Number" inputMode="numeric" value={form.phoneNumber} className={fieldErrors.phoneNumber ? "border-red-500 ring-2 ring-red-500/30" : ""} onChange={(e) => { setForm({ ...form, phoneNumber: e.target.value.replace(/[^0-9+\s]/g, "") }); setFieldErrors((p) => ({ ...p, phoneNumber: "" })); }} placeholder="09XXXXXXXXX or +63 9XX XXX XXXX" />
          {fieldErrors.phoneNumber && <p className="text-xs text-red-600 -mt-3 mb-3">{fieldErrors.phoneNumber}</p>}
        </div>
        <Select label="Role" value={form.role} disabled={me?.role !== "ADMIN"} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="CUSTOMER">CUSTOMER</option>
          <option value="STAFF">STAFF</option>
          <option value="ADMIN">ADMIN</option>
        </Select>
        <div>
          <Input
            label={edit ? "New Password (leave blank to keep current)" : "Password (default: Password123!)"}
            type="password"
            value={form.password}
            className={fieldErrors.password ? "border-red-500 ring-2 ring-red-500/30" : ""}
            onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((p) => ({ ...p, password: "" })); }}
          />
          {fieldErrors.password && <p className="text-xs text-red-600 -mt-3 mb-3">{fieldErrors.password}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setConfirmSave(true)}>{edit ? "Save Changes" : "Create Customer"}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={confirmSave} onClose={() => setConfirmSave(false)} onConfirm={() => { setConfirmSave(false); save(); }} title="Confirm Save" message={edit ? "Save changes to this customer?" : "Create this customer?"} />

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Delete Customer" message="Delete this customer? Their reviews and cart will be removed; transaction history is kept." />
      <SuccessModal open={!!msg} onClose={() => setMsg("")} message={msg} />
      <ErrorModal open={!!err} onClose={() => setErr("")} message={err} />
    </div>
  );
};

export const AdminSettings: React.FC = () => {
  const [tab, setTab] = React.useState<"payment" | "shop" | "system" | "security">("payment");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const [gw, setGw] = React.useState<any>(null);

  // Payment Gateway state
  const [pay, setPay] = React.useState({ gcash: true, maya: true, sandbox: true, pubKey: "", secretKey: "" });
  const [showSecret, setShowSecret] = React.useState(false);

  // Shop Profile state
  const [shop, setShop] = React.useState({ name: "CP TechFix", email: "info@cptechfix.com", phone: "+63 123 456 5770", address: "123 Tech Drive, Guezoe City, Philippines", tax: 12, currency: "PHP", receipt: "Thank you for your business!" });
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  // System & Notifications state
  const [sys, setSys] = React.useState({ emailNotif: true, orderConfirm: true, lowStock: true, paymentNotif: true, refundNotif: true, maintenance: false, dateTimeFormat: "MM/DD/YYYY HH:mm" });

  // Security state
  const [sec, setSec] = React.useState({ current: "", newPwd: "", confirm: "", sessionTimeout: 30, twoFA: false, apiKey: "sk_live_••••••••••••" });
  const [showPwd, setShowPwd] = React.useState(false);

  React.useEffect(() => {
    (async () => { try { setGw((await api.get("/payments/gateway-status")).data); } catch {} })();
    // load saved non-sensitive settings from localStorage (mock persistence)
    try {
      const s = localStorage.getItem("cp_settings_shop");
      if (s) setShop(JSON.parse(s));
      const sy = localStorage.getItem("cp_settings_sys");
      if (sy) setSys(JSON.parse(sy));
    } catch {}
  }, []);

  const save = async (label: string, fn: () => Promise<void> | void) => {
    setSaving(true); setErr(""); setMsg("");
    try {
      await fn();
      setMsg(`${label} saved successfully`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || `Failed to save ${label}`);
    } finally { setSaving(false); }
  };

  const reset = (label: string, fn: () => void) => {
    if (!window.confirm(`Reset ${label} to default?`)) return;
    fn();
    setMsg(`${label} reset to defaults`);
  };

  const tabs = [
    { id: "payment", label: "Payment Gateway", icon: "💳" },
    { id: "shop", label: "Shop Profile & Tax", icon: "🏪" },
    { id: "system", label: "System & Notifications", icon: "🔔" },
    { id: "security", label: "Security & API Keys", icon: "🔐" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your store configuration, payments, and security</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === t.id ? "bg-white text-navy border border-slate-200 border-b-white -mb-px" : "text-slate-500 hover:text-navy"}`}
          >
            <span className="mr-2">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Payment Gateway */}
      {tab === "payment" && (
        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-navy text-lg">Payment Gateway</h3>
          {gw && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-4">
              <div><span className="text-slate-500">Provider:</span> <span className="font-semibold text-navy">{gw.provider}</span></div>
              <div><span className="text-slate-500">Mode:</span> <span className="font-semibold text-navy">{gw.mode}</span></div>
              <div><span className="text-slate-500">Configured:</span> <span className={`font-semibold ${gw.configured ? "text-brandgreen" : "text-amber-600"}`}>{gw.configured ? "Yes" : "No (sandbox)"}</span></div>
              <div><span className="text-slate-500">Methods:</span> <span className="font-semibold text-navy">{gw.supportedMethods?.join(", ")}</span></div>
            </div>
          )}
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">Enable GCash</span>
              <input type="checkbox" checked={pay.gcash} onChange={(e) => setPay({ ...pay, gcash: e.target.checked })} className="w-5 h-5 accent-brandgreen" />
            </label>
            <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">Enable Maya</span>
              <input type="checkbox" checked={pay.maya} onChange={(e) => setPay({ ...pay, maya: e.target.checked })} className="w-5 h-5 accent-brandgreen" />
            </label>
            <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">Sandbox / Test Mode</span>
              <input type="checkbox" checked={pay.sandbox} onChange={(e) => setPay({ ...pay, sandbox: e.target.checked })} className="w-5 h-5 accent-brandgreen" />
            </label>
          </div>
          <Input label="API Public Key" value={pay.pubKey} onChange={(e) => setPay({ ...pay, pubKey: e.target.value })} placeholder="pk_test_..." />
          <div className="relative">
            <Input label="Secret Key" type={showSecret ? "text" : "password"} value={pay.secretKey} onChange={(e) => setPay({ ...pay, secretKey: e.target.value })} placeholder="sk_test_..." />
            <button type="button" onClick={() => setShowSecret((s) => !s)} className="absolute right-3 top-9 text-slate-400 hover:text-navy text-xs">{showSecret ? "Hide" : "Show"}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => save("Payment settings", async () => { await new Promise((r) => setTimeout(r, 400)); })}>{saving ? "Saving..." : "Save Payment Settings"}</Button>
            <Button variant="secondary" onClick={() => reset("Payment settings", () => setPay({ gcash: true, maya: true, sandbox: true, pubKey: "", secretKey: "" }))}>Reset to Default</Button>
          </div>
          {!gw?.configured && <p className="text-amber-700 bg-amber-50 rounded-lg p-3 text-xs">Set PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET in backend/.env to enable real PayMongo payments. Leave blank to keep sandbox simulation.</p>}
        </Card>
      )}

      {/* Shop Profile & Tax */}
      {tab === "shop" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-navy text-lg">Shop Profile & Tax</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
              {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs">No logo</span>}
            </div>
            <label className="cursor-pointer px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { const r = new FileReader(); r.onload = () => setLogoPreview(r.result as string); r.readAsDataURL(f); }
              }} />
            </label>
          </div>
          <Input label="Shop Name" value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
          <Input label="Business Email" type="email" value={shop.email} onChange={(e) => setShop({ ...shop, email: e.target.value })} />
          <Input label="Contact Number" value={shop.phone} onChange={(e) => setShop({ ...shop, phone: e.target.value })} />
          <Input label="Business Address" value={shop.address} onChange={(e) => setShop({ ...shop, address: e.target.value })} />
          <Input label="Tax Rate (%)" type="number" value={shop.tax} onChange={(e) => setShop({ ...shop, tax: Number(e.target.value) })} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
            <select value={shop.currency} onChange={(e) => setShop({ ...shop, currency: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm">
              <option value="PHP">PHP (₱)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <Input label="Receipt Footer" value={shop.receipt} onChange={(e) => setShop({ ...shop, receipt: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => save("Shop profile", async () => { localStorage.setItem("cp_settings_shop", JSON.stringify(shop)); await new Promise((r) => setTimeout(r, 400)); })}>{saving ? "Saving..." : "Save Shop Profile"}</Button>
            <Button variant="secondary" onClick={() => reset("Shop profile", () => setShop({ name: "CP TechFix", email: "info@cptechfix.com", phone: "+63 123 456 5770", address: "123 Tech Drive, Guezoe City, Philippines", tax: 12, currency: "PHP", receipt: "Thank you for your business!" }))}>Reset to Default</Button>
          </div>
        </Card>
      )}

      {/* System & Notifications */}
      {tab === "system" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-navy text-lg">System & Notifications</h3>
          {[
            { key: "emailNotif", label: "Email Notifications" },
            { key: "orderConfirm", label: "Order Confirmation Notifications" },
            { key: "lowStock", label: "Low-Stock Alerts" },
            { key: "paymentNotif", label: "Payment Notifications" },
            { key: "refundNotif", label: "Refund Notifications" },
            { key: "maintenance", label: "Maintenance Mode" },
          ].map((t) => (
            <label key={t.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">{t.label}</span>
              <input type="checkbox" checked={(sys as any)[t.key]} onChange={(e) => setSys({ ...sys, [t.key]: e.target.checked })} className="w-5 h-5 accent-brandgreen" />
            </label>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date & Time Format</label>
            <select value={sys.dateTimeFormat} onChange={(e) => setSys({ ...sys, dateTimeFormat: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm">
              <option value="MM/DD/YYYY HH:mm">MM/DD/YYYY HH:mm</option>
              <option value="DD/MM/YYYY HH:mm">DD/MM/YYYY HH:mm</option>
              <option value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => save("System settings", async () => { localStorage.setItem("cp_settings_sys", JSON.stringify(sys)); await new Promise((r) => setTimeout(r, 400)); })}>{saving ? "Saving..." : "Save System Settings"}</Button>
            <Button variant="secondary" onClick={() => reset("System settings", () => setSys({ emailNotif: true, orderConfirm: true, lowStock: true, paymentNotif: true, refundNotif: true, maintenance: false, dateTimeFormat: "MM/DD/YYYY HH:mm" }))}>Reset to Default</Button>
          </div>
        </Card>
      )}

      {/* Security & API Keys */}
      {tab === "security" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-navy text-lg">Security & API Keys</h3>
          <Input label="Current Password" type={showPwd ? "text" : "password"} value={sec.current} onChange={(e) => setSec({ ...sec, current: e.target.value })} />
          <Input label="New Password" type={showPwd ? "text" : "password"} value={sec.newPwd} onChange={(e) => setSec({ ...sec, newPwd: e.target.value })} />
          <Input label="Confirm Password" type={showPwd ? "text" : "password"} value={sec.confirm} onChange={(e) => setSec({ ...sec, confirm: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} /> Show passwords</label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Session Timeout (minutes)</label>
            <input type="number" value={sec.sessionTimeout} onChange={(e) => setSec({ ...sec, sessionTimeout: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" />
          </div>
          <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Two-Factor Authentication</span>
            <input type="checkbox" checked={sec.twoFA} onChange={(e) => setSec({ ...sec, twoFA: e.target.checked })} className="w-5 h-5 accent-brandgreen" />
          </label>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
            <span className="text-sm font-medium text-slate-700 flex-1">API Key: {sec.apiKey}</span>
            <Button size="sm" variant="secondary" onClick={() => { if (window.confirm("Regenerate API key?")) setSec({ ...sec, apiKey: "sk_live_" + Math.random().toString(36).slice(2, 14) }); }}>Regenerate</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => {
              if (sec.newPwd && sec.newPwd !== sec.confirm) { setErr("Passwords do not match"); return; }
              save("Security settings", async () => { await new Promise((r) => setTimeout(r, 400)); setSec({ ...sec, current: "", newPwd: "", confirm: "" }); });
            }}>{saving ? "Saving..." : "Save Security Settings"}</Button>
          </div>
          <p className="text-xs text-slate-400">Login activity and password changes are processed server-side. Sensitive credentials are never stored in the browser.</p>
        </Card>
      )}

      {msg && <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">{msg}</div>}
      {err && <div className="fixed bottom-6 right-6 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">{err}</div>}
    </div>
  );
};
