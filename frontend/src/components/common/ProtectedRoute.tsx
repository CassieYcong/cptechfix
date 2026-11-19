import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, token } = useAuth();
  const isAdmin = roles?.some((r) => r === "ADMIN" || r === "STAFF");
  if (!token) return <Navigate to={isAdmin ? "/admin/login" : "/login"} replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
