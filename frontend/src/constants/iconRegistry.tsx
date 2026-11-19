import React from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Settings, CreditCard, Wallet, Banknote,
  Building2, Store, Eye, Pencil, Trash2, Plus, Minus, Search, Filter, X,
  Wrench, Users, TrendingUp, DollarSign, AlertTriangle, ArrowRight, CheckCircle2,
  Star, Calendar, Truck, MapPin, Phone, Mail, Clock, Home, ChevronRight,
  ShieldCheck, Database, Cpu, Monitor, RotateCcw, History, BarChart3,
} from "lucide-react";
import gcashlogo from "../assets/gcashlogo.png";
import paymayalogo from "../assets/paymayalogo.png";

export const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  gcash: <img src={gcashlogo} alt="GCash" className="w-full h-full object-contain" />,
  maya: <img src={paymayalogo} alt="Maya" className="w-full h-full object-contain" />,
  debit_credit_card: <CreditCard size={20} />,
  bank_transfer: <Building2 size={20} />,
  cash_on_delivery: <Banknote size={20} />,
  cash_at_store: <Store size={20} />,
};

export const NAV_ICONS = {
  dashboard: <LayoutDashboard size={16} />,
  products: <Package size={16} />,
  orders: <ShoppingCart size={16} />,
  settings: <Settings size={16} />,
  repairs: <Wrench size={16} />,
  customers: <Users size={16} />,
  reports: <BarChart3 size={16} />,
  home: <Home size={16} />,
};

export const DASHBOARD_ICONS = {
  revenue: <DollarSign size={24} />,
  orders: <ShoppingCart size={24} />,
  repairs: <Wrench size={24} />,
  customers: <Users size={24} />,
  products: <Package size={24} />,
  refunds: <RotateCcw size={24} />,
  alerts: <AlertTriangle size={16} />,
  trending: <TrendingUp size={24} />,
};

export const ACTION_ICONS = {
  view: <Eye size={14} />,
  edit: <Pencil size={14} />,
  delete: <Trash2 size={14} />,
  add: <Plus size={16} />,
  remove: <Minus size={12} />,
  search: <Search size={16} />,
  filter: <Filter size={16} />,
  close: <X size={20} />,
  confirm: <CheckCircle2 size={16} />,
  navigate: <ArrowRight size={14} />,
  star: <Star size={14} />,
  calendar: <Calendar size={12} />,
  truck: <Truck size={18} />,
  mapPin: <MapPin size={18} />,
  phone: <Phone size={20} />,
  mail: <Mail size={18} />,
  clock: <Clock size={20} />,
};

export const ORDER_STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock size={14} />,
  CONFIRMED: <CheckCircle2 size={14} />,
  PROCESSING: <RotateCcw size={14} />,
  READY_FOR_PICKUP: <Package size={14} />,
  COMPLETED: <CheckCircle2 size={14} />,
  CANCELLED: <X size={14} />,
};

export function getIcon(id: string): React.ReactNode | undefined {
  return PAYMENT_ICONS[id] ?? NAV_ICONS[id as keyof typeof NAV_ICONS] ?? DASHBOARD_ICONS[id as keyof typeof DASHBOARD_ICONS] ?? ACTION_ICONS[id as keyof typeof ACTION_ICONS];
}