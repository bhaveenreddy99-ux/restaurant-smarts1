import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, TrendingUp, ShoppingCart, ArrowUpRight, Building2, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ParAlertsBanner from "@/components/ParAlertsBanner";

// ─── Portfolio Dashboard (All Restaurants) ───
function PortfolioDashboard({ setCurrentRestaurant }: { setCurrentRestaurant: (r: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { setLoading(false); return; }

      try {
        const res = await supabase.functions.invoke("portfolio-dashboard");
        if (res.data) setData(res.data);
      } catch (e) {
        console.error("Portfolio fetch error:", e);
      }
      setLoading(false);
    };
    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-7 w-60" />
        <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const totals = data?.totals || { red: 0, yellow: 0, green: 0 };
  const restaurants = data?.restaurants || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Portfolio Dashboard</h1>
          <p className="page-description">Overview across all your restaurants</p>
        </div>
      </div>

      {/* Aggregate Stock Status */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-destructive/15 hover:shadow-card transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/8"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div><p className="stat-value text-destructive">{totals.red}</p><p className="text-xs text-muted-foreground">Total Critical</p></div>
          </CardContent>
        </Card>
        <Card className="border-warning/15 hover:shadow-card transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/8"><Package className="h-5 w-5 text-warning" /></div>
            <div><p className="stat-value text-warning">{totals.yellow}</p><p className="text-xs text-muted-foreground">Total Low Stock</p></div>
          </CardContent>
        </Card>
        <Card className="border-success/15 hover:shadow-card transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/8"><Package className="h-5 w-5 text-success" /></div>
            <div><p className="stat-value text-success">{totals.green}</p><p className="text-xs text-muted-foreground">Total Stocked</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant Breakdown */}
      <Card className="hover:shadow-card transition-shadow">
        <div className="flex items-center gap-2 p-5 pb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Restaurant Breakdown</h3>
        </div>
        <CardContent className="pt-0 pb-4 px-5">
          {restaurants.length === 0 ? (
            <div className="empty-state py-8">
              <Building2 className="empty-state-icon h-8 w-8" />
              <p className="empty-state-title">No restaurants found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Restaurant</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Critical</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Low Stock</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Orders</TableHead>
                  <TableHead className="text-xs font-semibold">Last Approved</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Alerts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((r: any) => (
                  <TableRow
                    key={r.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setCurrentRestaurant({ id: r.id, name: r.name, role: r.role });
                      navigate("/app/dashboard");
                    }}
                  >
                    <TableCell className="font-medium text-sm">{r.name}</TableCell>
                    <TableCell className="text-center">
                      {r.red > 0 ? <Badge variant="destructive" className="text-[10px]">{r.red}</Badge> : <span className="text-muted-foreground text-xs">0</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.yellow > 0 ? <Badge className="bg-warning text-warning-foreground text-[10px]">{r.yellow}</Badge> : <span className="text-muted-foreground text-xs">0</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm">{r.recentOrders}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.lastApproved ? new Date(r.lastApproved).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.unreadAlerts > 0 ? (
                        <Badge variant="outline" className="text-[10px] gap-1"><Bell className="h-3 w-3" />{r.unreadAlerts}</Badge>
                      ) : <span className="text-muted-foreground text-xs">0</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Single Restaurant Dashboard ───
function SingleDashboard() {
  const { currentRestaurant, currentLocation } = useRestaurant();
  const navigate = useNavigate();
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

      let sessionQuery = supabase
        .from("inventory_sessions")
        .select("id")
        .eq("restaurant_id", rid)
        .eq("status", "APPROVED")
        .order("approved_at", { ascending: false })
        .limit(1);

      if (currentLocation) {
        sessionQuery = sessionQuery.eq("location_id", currentLocation.id);
      }

      const { data: sessions } = await sessionQuery;

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
          setTopReorder(reorderList.sort((a, b) => b.suggestedOrder - a.suggestedOrder).slice(0, 8));
        }
      } else {
        setStockStatus({ red: 0, yellow: 0, green: 0 });
        setTopReorder([]);
      }

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
        setHighUsage(Object.entries(grouped).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total).slice(0, 8));
      }

      let ordersQuery = supabase.from("orders").select("*").eq("restaurant_id", rid).order("created_at", { ascending: false }).limit(8);
      if (currentLocation) ordersQuery = ordersQuery.eq("location_id", currentLocation.id);
      const { data: orders } = await ordersQuery;
      if (orders) setRecentOrders(orders);
      setLoading(false);
    };
    fetchData();
  }, [currentRestaurant, currentLocation]);

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-7 w-40" />
        <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid gap-5 lg:grid-cols-2">{[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
      </div>
    );
  }

  const riskBadge = (ratio: number) => {
    if (ratio < 0.5) return <Badge variant="destructive" className="text-[10px] font-medium">LOW</Badge>;
    if (ratio < 1) return <Badge className="bg-warning text-warning-foreground text-[10px] font-medium">MED</Badge>;
    return <Badge className="bg-success text-success-foreground text-[10px] font-medium">OK</Badge>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <ParAlertsBanner />
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            {currentRestaurant?.name}
            {currentLocation ? ` — ${currentLocation.name}` : ""}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate("/app/smart-order")}>
          <ShoppingCart className="h-3.5 w-3.5" /> Smart Order
        </Button>
      </div>

      {/* Stock Status Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-destructive/15 hover:shadow-card transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/8"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div><p className="stat-value text-destructive">{stockStatus.red}</p><p className="text-xs text-muted-foreground">Critical Stock</p></div>
          </CardContent>
        </Card>
        <Card className="border-warning/15 hover:shadow-card transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/8"><Package className="h-5 w-5 text-warning" /></div>
            <div><p className="stat-value text-warning">{stockStatus.yellow}</p><p className="text-xs text-muted-foreground">Low Stock</p></div>
          </CardContent>
        </Card>
        <Card className="border-success/15 hover:shadow-card transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/8"><Package className="h-5 w-5 text-success" /></div>
            <div><p className="stat-value text-success">{stockStatus.green}</p><p className="text-xs text-muted-foreground">Stocked</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top Reorder */}
        <Card className="hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Top Reorder Items</h3></div>
            {topReorder.length > 0 && <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/app/smart-order")}>Order <ArrowUpRight className="h-3 w-3" /></Button>}
          </div>
          <CardContent className="pt-0 pb-4 px-5">
            {topReorder.length === 0 ? (
              <div className="empty-state py-8"><ShoppingCart className="empty-state-icon h-8 w-8" /><p className="empty-state-title">No approved inventory data yet</p><p className="empty-state-description">Approve an inventory session to see reorder suggestions.</p></div>
            ) : (
              <div className="space-y-1">{topReorder.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">{riskBadge(item.ratio)}<span className="text-sm">{item.item_name}</span></div>
                  <span className="text-sm font-mono font-semibold">{item.suggestedOrder} <span className="text-muted-foreground font-normal text-xs">{item.unit}</span></span>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>

        {/* High Usage */}
        <Card className="hover:shadow-card transition-shadow">
          <div className="flex items-center gap-2 p-5 pb-3"><TrendingUp className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">High Usage Items</h3></div>
          <CardContent className="pt-0 pb-4 px-5">
            {highUsage.length === 0 ? (
              <div className="empty-state py-8"><TrendingUp className="empty-state-icon h-8 w-8" /><p className="empty-state-title">No usage data yet</p><p className="empty-state-description">Create orders to start tracking usage.</p></div>
            ) : (
              <div className="space-y-1">{highUsage.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm">{item.name}</span>
                  <div className="text-right"><span className="text-sm font-mono font-semibold">{item.total}</span><span className="text-[11px] text-muted-foreground ml-1.5">({item.count}×)</span></div>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="hover:shadow-card transition-shadow">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-sm font-semibold">Recent Orders</h3>
          {recentOrders.length > 0 && <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/app/orders")}>View all <ArrowUpRight className="h-3 w-3" /></Button>}
        </div>
        <CardContent className="pt-0 pb-4 px-5">
          {recentOrders.length === 0 ? (
            <div className="empty-state py-8"><Package className="empty-state-icon h-8 w-8" /><p className="empty-state-title">No orders yet</p></div>
          ) : (
            <div className="space-y-1">{recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-sm font-mono text-muted-foreground">{order.id.slice(0, 8)}</span>
                <Badge variant={order.status === "COMPLETED" ? "default" : "secondary"} className="text-[10px] font-medium">{order.status}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard Page ───
export default function DashboardPage() {
  const { isPortfolioMode, setCurrentRestaurant } = useRestaurant();

  if (isPortfolioMode) {
    return <PortfolioDashboard setCurrentRestaurant={setCurrentRestaurant} />;
  }

  return <SingleDashboard />;
}
