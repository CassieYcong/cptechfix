import React from "react";

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }> = ({ children, className = "", variant, size, ...props }) => {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes: Record<string,string> = { sm: "px-3 py-1.5 text-sm", lg: "px-6 py-3 text-base", default: "px-4 py-2 text-sm" };
  const variants: Record<string,string> = {
    primary: "btn-primary text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:ring-navy",
    secondary: "bg-white text-navy border border-navy/20 hover:bg-navy/5 focus:ring-navy",
    danger: "bg-red-600 text-white shadow-md hover:bg-red-700 hover:-translate-y-0.5 focus:ring-red-500",
    green: "btn-green text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:ring-brandgreen",
    ghost: "text-navy hover:bg-navy/5",
  };
  const v = variants[variant || "primary"] || variants.primary;
  return <button className={`${base} ${sizes[size || "default"]} ${v} ${className}`} {...props}>{children}</button>;
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean }> = ({ children, className = "", hover }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${hover ? "card-hover" : ""} ${className}`}>{children}</div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "blue" }) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-1 ring-red-200",
    yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    gray: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    navy: "bg-navy/10 text-navy ring-1 ring-navy/20",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>{children}</span>;
};

const inputBase = "w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm bg-white transition focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy placeholder:text-slate-400";

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: React.ReactNode }> = ({ label, className = "", icon, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      <input className={`${inputBase} ${icon ? "pl-10" : ""} ${className}`} {...props} />
    </div>
  </div>
);

export const NumberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; integer?: boolean }> = ({ label, className = "", integer, ...props }) => {
  const value = props.value === undefined || props.value === null ? "" : String(props.value);
  const onChange = props.onChange;
  const onFocus = props.onFocus;
  const onBlur = props.onBlur;
  const sanitize = (v: string) => {
    if (v === "") return "";
    if (integer) return v.replace(/[^0-9]/g, "");
    return v.replace(/[^0-9.]/g, "");
  };
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <input
        {...props}
        value={value}
        inputMode={integer ? "numeric" : "decimal"}
        className={`${inputBase} ${className}`}
        onChange={(e) => {
          const v = sanitize(e.target.value);
          onChange?.({ ...e, target: { ...e.target, value: v } } as any);
        }}
        onFocus={(e) => {
          // Clear a default 0 so the user can type immediately.
          if (String(e.currentTarget.value) === "0") {
            onChange?.({ ...e, target: { ...e.target, value: "" } } as any);
          }
          onFocus?.(e);
        }}
        onBlur={(e) => {
          onBlur?.(e);
        }}
      />
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: React.ReactNode }> = ({ label, className = "", children, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <select className={`${inputBase} ${className}`} {...props}>{children}</select>
  </div>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <textarea className={`${inputBase} min-h-[90px] ${className}`} {...props} />
  </div>
);

export const StatCard: React.FC<{ label: string; value: string | number; icon?: React.ReactNode; color?: string; trend?: string }> = ({ label, value, icon, color = "navy", trend }) => {
  const colors: Record<string,string> = { navy: "from-navy to-navy-light", green: "from-brandgreen to-brandgreen-light", blue: "from-blue-500 to-blue-600", amber: "from-amber-500 to-amber-600" };
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${colors[color] || colors.navy} shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium opacity-90">{label}</div>
          <div className="text-3xl font-bold mt-1">{value}</div>
          {trend && <div className="text-xs opacity-80 mt-1">{trend}</div>}
        </div>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
    </div>
  );
};
