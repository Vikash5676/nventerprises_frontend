import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const ShopContext = createContext(null);

const DEFAULT = {
  name: "Garage OS",
  tagline: "Two-Wheeler Repair & Parts",
  logo_base64: "",
  address: "",
  phone: "",
  gstin: "",
  state: "Jharkhand",
};

export function ShopProvider({ children }) {
  const [shop, setShop] = useState(DEFAULT);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/shop/info");
      setShop({ ...DEFAULT, ...data });
    } catch {
      // ignore — public endpoint, but harmless
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch) => {
    const next = { ...shop, ...patch };
    const { data } = await api.put("/shop/info", next);
    setShop({ ...DEFAULT, ...data });
    return data;
  };

  return (
    <ShopContext.Provider value={{ shop, save, refresh: load }}>{children}</ShopContext.Provider>
  );
}

export const useShop = () => useContext(ShopContext) || { shop: DEFAULT, save: async () => {}, refresh: async () => {} };
