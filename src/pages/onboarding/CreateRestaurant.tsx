import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";

export default function CreateRestaurantPage() {
  const { user } = useAuth();
  const { refetch } = useRestaurant();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;

      const { error: mErr } = await supabase
        .from("restaurant_members")
        .insert({ restaurant_id: restaurant.id, user_id: user.id, role: "OWNER" });
      if (mErr) throw mErr;

      await refetch();
      toast.success("Restaurant created!");
      navigate("/app/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center">
          <ChefHat className="mx-auto h-10 w-10 text-primary mb-3" />
          <h1 className="text-2xl font-bold">Create Your Restaurant</h1>
          <p className="text-sm text-muted-foreground mt-1">Get started with RestarentIQ</p>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="My Restaurant" />
          </div>
          <Button type="submit" className="w-full bg-gradient-amber" disabled={loading}>
            {loading ? "Creating..." : "Create Restaurant"}
          </Button>
        </form>
      </div>
    </div>
  );
}
