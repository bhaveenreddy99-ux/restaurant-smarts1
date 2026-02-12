import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Button } from "@/components/ui/button";
import { ChefHat, ClipboardList, Package, CheckCircle, BarChart3, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const steps = [
  { icon: ClipboardList, title: "Create PAR Guide", desc: "Define target stock levels for each item to maintain optimal inventory." },
  { icon: Package, title: "Create Inventory List", desc: "Organize items by category — Frozen, Cooler, Dry, and custom groups." },
  { icon: CheckCircle, title: "Enter → Review → Approve", desc: "Staff enters counts, managers review, owners approve. Full audit trail." },
  { icon: BarChart3, title: "Smart Order + Reports", desc: "Auto-generate reorder lists and track cost, usage, and consumption." },
];

export default function DemoPage() {
  const { user } = useAuth();
  const { refetch } = useRestaurant();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCreateDemo = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Create demo restaurant
      const { data: restaurant, error: rErr } = await supabase
        .from("restaurants")
        .insert({ name: "Demo Restaurant" })
        .select()
        .single();
      if (rErr) throw rErr;

      // Add user as OWNER
      const { error: mErr } = await supabase
        .from("restaurant_members")
        .insert({ restaurant_id: restaurant.id, user_id: user.id, role: "OWNER" });
      if (mErr) throw mErr;

      // Seed inventory list
      const { data: invList } = await supabase
        .from("inventory_lists")
        .insert({ restaurant_id: restaurant.id, name: "Main Kitchen", created_by: user.id })
        .select()
        .single();

      // Seed PAR guide
      const { data: parGuide } = await supabase
        .from("par_guides")
        .insert({ restaurant_id: restaurant.id, name: "Standard PAR", created_by: user.id })
        .select()
        .single();

      const parItems = [
        { par_guide_id: parGuide!.id, item_name: "Chicken Breast", category: "Cooler", unit: "lbs", par_level: 50 },
        { par_guide_id: parGuide!.id, item_name: "Ground Beef", category: "Cooler", unit: "lbs", par_level: 40 },
        { par_guide_id: parGuide!.id, item_name: "French Fries", category: "Frozen", unit: "bags", par_level: 30 },
        { par_guide_id: parGuide!.id, item_name: "Burger Buns", category: "Dry", unit: "packs", par_level: 25 },
        { par_guide_id: parGuide!.id, item_name: "Lettuce", category: "Cooler", unit: "heads", par_level: 20 },
        { par_guide_id: parGuide!.id, item_name: "Tomatoes", category: "Cooler", unit: "lbs", par_level: 15 },
        { par_guide_id: parGuide!.id, item_name: "Cooking Oil", category: "Dry", unit: "gallons", par_level: 10 },
        { par_guide_id: parGuide!.id, item_name: "Ice Cream", category: "Frozen", unit: "tubs", par_level: 12 },
      ];
      await supabase.from("par_guide_items").insert(parItems);

      // Seed approved session
      const { data: session } = await supabase
        .from("inventory_sessions")
        .insert({
          restaurant_id: restaurant.id,
          inventory_list_id: invList!.id,
          name: "Opening Count",
          status: "APPROVED",
          created_by: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      const sessionItems = [
        { session_id: session!.id, item_name: "Chicken Breast", category: "Cooler", unit: "lbs", current_stock: 20, par_level: 50, unit_cost: 4.5 },
        { session_id: session!.id, item_name: "Ground Beef", category: "Cooler", unit: "lbs", current_stock: 35, par_level: 40, unit_cost: 5.0 },
        { session_id: session!.id, item_name: "French Fries", category: "Frozen", unit: "bags", current_stock: 10, par_level: 30, unit_cost: 3.0 },
        { session_id: session!.id, item_name: "Burger Buns", category: "Dry", unit: "packs", current_stock: 22, par_level: 25, unit_cost: 2.0 },
        { session_id: session!.id, item_name: "Lettuce", category: "Cooler", unit: "heads", current_stock: 8, par_level: 20, unit_cost: 1.5 },
        { session_id: session!.id, item_name: "Tomatoes", category: "Cooler", unit: "lbs", current_stock: 12, par_level: 15, unit_cost: 2.0 },
        { session_id: session!.id, item_name: "Cooking Oil", category: "Dry", unit: "gallons", current_stock: 3, par_level: 10, unit_cost: 8.0 },
        { session_id: session!.id, item_name: "Ice Cream", category: "Frozen", unit: "tubs", current_stock: 5, par_level: 12, unit_cost: 6.0 },
      ];
      await supabase.from("inventory_session_items").insert(sessionItems);

      // Seed orders + usage
      const { data: order } = await supabase
        .from("orders")
        .insert({ restaurant_id: restaurant.id, created_by: user.id, status: "COMPLETED" })
        .select()
        .single();

      const orderItems = [
        { order_id: order!.id, item_name: "Chicken Breast", quantity: 10, unit: "lbs" },
        { order_id: order!.id, item_name: "French Fries", quantity: 5, unit: "bags" },
        { order_id: order!.id, item_name: "Lettuce", quantity: 4, unit: "heads" },
      ];
      await supabase.from("order_items").insert(orderItems);

      const usageEvents = [
        { restaurant_id: restaurant.id, item_name: "Chicken Breast", order_id: order!.id, quantity_used: 10 },
        { restaurant_id: restaurant.id, item_name: "French Fries", order_id: order!.id, quantity_used: 5 },
        { restaurant_id: restaurant.id, item_name: "Lettuce", order_id: order!.id, quantity_used: 4 },
        { restaurant_id: restaurant.id, item_name: "Ground Beef", quantity_used: 8 },
        { restaurant_id: restaurant.id, item_name: "Tomatoes", quantity_used: 3 },
        { restaurant_id: restaurant.id, item_name: "Cooking Oil", quantity_used: 2 },
      ];
      await supabase.from("usage_events").insert(usageEvents);

      // Seed smart order run
      const { data: smartRun } = await supabase
        .from("smart_order_runs")
        .insert({ restaurant_id: restaurant.id, session_id: session!.id, created_by: user.id })
        .select()
        .single();

      const smartItems = sessionItems.map(si => {
        const ratio = si.current_stock / Math.max(si.par_level, 1);
        return {
          run_id: smartRun!.id,
          item_name: si.item_name,
          suggested_order: Math.max(si.par_level - si.current_stock, 0),
          risk: ratio < 0.5 ? "RED" : ratio < 1 ? "YELLOW" : "GREEN",
          current_stock: si.current_stock,
          par_level: si.par_level,
        };
      });
      await supabase.from("smart_order_run_items").insert(smartItems);

      await refetch();
      toast.success("Demo workspace created!");
      navigate("/app/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create demo");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl animate-fade-in">
        <div className="text-center mb-10">
          <ChefHat className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold">Welcome to Resta<span className="text-gradient-amber">rentIQ</span></h1>
          <p className="mt-2 text-muted-foreground">Here's how the workflow works</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-10">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={() => navigate("/onboarding/create-restaurant")}
            size="lg"
            className="bg-gradient-amber shadow-amber gap-2"
          >
            Create your first restaurant <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleCreateDemo}
            size="lg"
            variant="outline"
            disabled={loading}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Creating demo..." : "Create demo workspace"}
          </Button>
        </div>
      </div>
    </div>
  );
}
