import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { CustomerLayout } from "../layouts/CustomerLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { Landing } from "../pages/Landing";
import { Login, Register, ForgotPassword, AdminLogin } from "../pages/Auth";
import { CustomerDashboard } from "../pages/customer/Dashboard";
import { CustomerRepairs } from "../pages/customer/Repairs";
import { Accessories } from "../pages/customer/Accessories";
import { ProductDetails } from "../pages/customer/ProductDetails";
import { Cart } from "../pages/customer/Cart";
import { Checkout } from "../pages/customer/Checkout";
import { CustomerOrders } from "../pages/customer/Orders";
import { Tracking, BillingHistory } from "../pages/customer/TrackingBilling";
import { CustomerReviews, Profile } from "../pages/customer/ReviewsProfile";
import { AdminDashboard } from "../pages/admin/Dashboard";
import { Walkins } from "../pages/admin/Walkins";
import { AdminRepairs } from "../pages/admin/Repairs";
import { AdminProducts } from "../pages/admin/Products";
import { AdminOrders } from "../pages/admin/Orders";
import { AdminRefunds } from "../pages/admin/Refunds";
import { AdminBilling } from "../pages/admin/Billing";
import { AdminBillingHistory } from "../pages/admin/BillingHistory";
import { AdminReviews } from "../pages/admin/Reviews";
import { AdminReports } from "../pages/admin/Reports";
import { AdminCustomers, AdminSettings } from "../pages/admin/CustomersSettings";
import { PaymentSuccess, PaymentCancel, PaymentSandbox } from "../pages/Payment";

export const ROUTE_PATHS = {
  home: "/",
  login: "/login",
  adminLogin: "/admin/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  repairRequest: "/repair-request",
  shop: "/shop",
  dashboardRepairRequest: "/dashboard/repair-request",
  dashboardShop: "/dashboard/shop",
  paymentSuccess: "/payment/success",
  paymentCancel: "/payment/cancel",
  paymentSandbox: "/payment/sandbox/:id",
  dashboard: "/dashboard",
  repairs: "/repairs",
  dashboardRepairs: "/dashboard/repairs",
  accessories: "/accessories",
  dashboardAccessories: "/dashboard/accessories",
  product: "/product/:id",
  cart: "/cart",
  checkout: "/checkout",
  orders: "/orders",
  tracking: "/tracking",
  billing: "/billing",
  reviews: "/reviews",
  profile: "/profile",
  admin: "/admin",
  adminWalkins: "/admin/walkins",
  adminRepairs: "/admin/repairs",
  adminProducts: "/admin/products",
  adminOrders: "/admin/orders",
  adminRefunds: "/admin/refunds",
  adminBilling: "/admin/billing",
  adminBillingHistory: "/admin/billing-history",
  adminReviews: "/admin/reviews",
  adminReports: "/admin/reports",
  adminProfile: "/admin/profile",
  adminCustomers: "/admin/customers",
  adminSettings: "/admin/settings",
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path={ROUTE_PATHS.home} element={<Landing />} />
      <Route path={ROUTE_PATHS.login} element={<Login />} />
      <Route path={ROUTE_PATHS.adminLogin} element={<AdminLogin />} />
      <Route path={ROUTE_PATHS.register} element={<Register />} />
      <Route path={ROUTE_PATHS.forgotPassword} element={<ForgotPassword />} />
      <Route path={ROUTE_PATHS.repairRequest} element={<CustomerRepairs />} />
      <Route path={ROUTE_PATHS.shop} element={<Accessories />} />
      <Route element={<CustomerLayout />}>
        <Route path={ROUTE_PATHS.dashboardRepairRequest} element={<CustomerRepairs />} />
        <Route path={ROUTE_PATHS.dashboardShop} element={<Accessories />} />
      </Route>
      <Route path={ROUTE_PATHS.paymentSuccess} element={<PaymentSuccess />} />
      <Route path={ROUTE_PATHS.paymentCancel} element={<PaymentCancel />} />
      <Route path={ROUTE_PATHS.paymentSandbox} element={<PaymentSandbox />} />

      <Route element={<ProtectedRoute roles={["CUSTOMER"]}><CustomerLayout /></ProtectedRoute>}>
        <Route path={ROUTE_PATHS.dashboard} element={<CustomerDashboard />} />
        <Route path={ROUTE_PATHS.repairs} element={<CustomerRepairs />} />
        <Route path={ROUTE_PATHS.dashboardRepairs} element={<CustomerRepairs />} />
        <Route path={ROUTE_PATHS.accessories} element={<Accessories />} />
        <Route path={ROUTE_PATHS.dashboardAccessories} element={<Accessories />} />
        <Route path={ROUTE_PATHS.product} element={<ProductDetails />} />
        <Route path={ROUTE_PATHS.cart} element={<Cart />} />
        <Route path={ROUTE_PATHS.checkout} element={<Checkout />} />
        <Route path={ROUTE_PATHS.orders} element={<CustomerOrders />} />
        <Route path={ROUTE_PATHS.tracking} element={<Tracking />} />
        <Route path={ROUTE_PATHS.billing} element={<BillingHistory />} />
        <Route path={ROUTE_PATHS.reviews} element={<CustomerReviews />} />
        <Route path={ROUTE_PATHS.profile} element={<Profile />} />
      </Route>

      <Route element={<ProtectedRoute roles={["ADMIN", "STAFF"]}><AdminLayout /></ProtectedRoute>}>
        <Route path={ROUTE_PATHS.admin} element={<AdminDashboard />} />
        <Route path={ROUTE_PATHS.adminWalkins} element={<Walkins />} />
        <Route path={ROUTE_PATHS.adminRepairs} element={<AdminRepairs />} />
        <Route path={ROUTE_PATHS.adminProducts} element={<AdminProducts />} />
        <Route path={ROUTE_PATHS.adminOrders} element={<AdminOrders />} />
        <Route path={ROUTE_PATHS.adminRefunds} element={<AdminRefunds />} />
        <Route path={ROUTE_PATHS.adminBilling} element={<AdminBilling />} />
        <Route path={ROUTE_PATHS.adminBillingHistory} element={<AdminBillingHistory />} />
        <Route path={ROUTE_PATHS.adminReviews} element={<AdminReviews />} />
        <Route path={ROUTE_PATHS.adminReports} element={<AdminReports />} />
        <Route path={ROUTE_PATHS.adminProfile} element={<Profile />} />
        <Route path={ROUTE_PATHS.adminCustomers} element={<AdminCustomers />} />
        <Route path={ROUTE_PATHS.adminSettings} element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;