import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../../lib/axios";

interface User { id: string; fullName: string; email: string; role: string; phoneNumber?: string; profileImage?: string | null; }

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      api.get("/auth/me").then((r) => setUser(r.data)).catch(() => { localStorage.removeItem("token"); setToken(null); });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (data: any) => {
    const r = await api.post("/auth/register", data);
    localStorage.setItem("token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
  };

  const refreshUser = async () => {
    if (!localStorage.getItem("token")) return;
    const r = await api.get("/auth/me");
    setUser(r.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, token, login, register, refreshUser, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
