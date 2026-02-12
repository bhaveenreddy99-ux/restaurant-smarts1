import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, TrendingUp, ShoppingCart } from "lucide-react";

export default function DashboardPage() {
  const { currentRestaurant } = useRestaurant();
  const [stockStatus, setStockStatus] = useState({ red: 0, yellow: 0, green: 0 });
  const [topReorder, setTopReorder] = useState<any[]>([]);
  const [highUsage, setHighUsage] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentRestaurant) return;
    const fetchData = async () => {
      setLoading(true);
      const rid = currentRestaurant.id;

      // Get latest approved session
      const { data: sessions } = await supabase
        .from("inventory_sessions")
        .select("id")
        .eq("restaurant_id", rid)
        .eq("status", "APPROVED")
        .order("approved_at", { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const { data: items } = await supabase
          .from("inventory_session_items")
          .select("*")
          .eq("session_id", sessions[0].id);

        if (items) {
          let r = 0, y = 0, g = 0;
          const reorderList = items.map(i => {
            const ratio = i.current_stock / Math.max(i.par_level, 1);
            if (ratio < 0.5) r++;
            else if (ratio < 1) y++;
            else g++;
            return { ...i, suggestedOrder: Math.max(i.par_level - i.current_stock, 0), ratio };
          });
          setStockStatus({ red: r, yellow: y, green: g });
          setTopReorder(reorderList.sort((a, b) => b.suggestedOrder - a.suggestedOrder).slice(0, 10));
        }
      }

      // High usage items
      const { data: usage } = await supabase
        .from("usage_events")
        .select("item_name, quantity_used")
        .eq("restaurant_id", rid);

      if (usage) {
        const grouped: Record<string, { total: number; count: number }> = {};
        usage.forEach(u => {
          if (!grouped[u.item_name]) grouped[u.item_name] = { total: 0, count: 0 };
          grouped[u.item_name].total += Number(u.quantity_used);
          grouped[u.item_name].count++;
        });
        const sorted = Object.entries(grouped)
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
        setHighUsage(sorted);
      }

      // Recent orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", rid)
        .order("created_at", { ascending: false })
        .limit(10);

      if (orders) setRecentOrders(orders);
      setLoading(false);
    };
    fetchData();
  }, [currentRestaurant]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const riskBadge = (ratio: number) => {
    if (ratio < 0.5) return <Badge variant="destructive" className="text-[10px]">LOW</Badge>;
    if (ratio < 1) return <Badge className="bg-risk-yellow text-foreground text-[10px]">MED</Badge>;
    return <Badge className="bg-risk-green text-primary-foreground text-[10px]">OK</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stock Status Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-risk-red/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stockStatus.red}</p>
              <p className="text-xs text-muted-foreground">Critical Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-risk-yellow/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-risk-yellow/10">
              <Package className="h-5 w-5 text-risk-yellow" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stockStatus.yellow}</p>
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-risk-green/10">
              <Package className="h-5 w-5 text-risk-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stockStatus.green}</p>
              <p className="text-xs text-muted-foreground">Stocked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Reorder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" /> Top Reorder Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topReorder.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved inventory data yet.</p>
            ) : (
              <div className="space-y-2">
                {topReorder.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      {riskBadge(item.ratio)}
                      <span className="text-sm">{item.item_name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">{item.suggestedOrder} {item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* High Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> High Usage Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage data yet.</p>
            ) : (
              <div className="space-y-2">
                {highUsage.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-mono font-medium">{item.total}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.count} orders)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm font-mono">{order.id.slice(0, 8)}</span>
                  <Badge variant={order.status === "COMPLETED" ? "default" : "secondary"} className="text-[10px]">
                    {order.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
