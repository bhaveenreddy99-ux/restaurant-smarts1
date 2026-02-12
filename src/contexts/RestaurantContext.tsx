import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Restaurant {
  id: string;
  name: string;
  role: string;
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  currentRestaurant: Restaurant | null;
  setCurrentRestaurant: (r: Restaurant) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurants: [],
  currentRestaurant: null,
  setCurrentRestaurant: () => {},
  loading: true,
  refetch: async () => {},
});

export const useRestaurant = () => useContext(RestaurantContext);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = async () => {
    if (!user) {
      setRestaurants([]);
      setCurrentRestaurant(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("restaurant_members")
      .select("restaurant_id, role, restaurants(id, name)")
      .eq("user_id", user.id);

    if (data) {
      const mapped = data.map((m: any) => ({
        id: m.restaurants.id,
        name: m.restaurants.name,
        role: m.role,
      }));
      setRestaurants(mapped);
      if (mapped.length > 0 && !currentRestaurant) {
        const saved = localStorage.getItem("currentRestaurantId");
        const found = mapped.find((r: Restaurant) => r.id === saved);
        setCurrentRestaurant(found || mapped[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRestaurants();
  }, [user]);

  const handleSetCurrent = (r: Restaurant) => {
    setCurrentRestaurant(r);
    localStorage.setItem("currentRestaurantId", r.id);
  };

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        currentRestaurant,
        setCurrentRestaurant: handleSetCurrent,
        loading,
        refetch: fetchRestaurants,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}
