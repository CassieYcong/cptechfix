import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../../lib/axios";
import { useAuth } from "./AuthContext";

interface CartCtx { count: number; refresh: () => Promise<void>; }
const Ctx = createContext<CartCtx>({ count: 0, refresh: async () => {} });
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const refresh = async () => {
    // Guests have no cart; skip the request so public pages don't log a 401.
    if (!localStorage.getItem("token")) { setCount(0); return; }
    try {
      const r = await api.get("/cart");
      setCount(r.data.reduce((a: number, c: any) => a + c.quantity, 0));
    } catch { setCount(0); }
  };
  useEffect(() => { refresh(); }, [token]);
  return <Ctx.Provider value={{ count, refresh }}>{children}</Ctx.Provider>;
};
export const useCart = () => useContext(Ctx);
