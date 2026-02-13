import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  const { currentRestaurant } = useRestaurant();
  const [costData, setCostData] = useState<any[]>([]);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);

  useEffect(() => {
    if (!currentRestaurant) return;
    const rid = currentRestaurant.id;
    supabase.from("inventory_sessions").select("id").eq("restaurant_id", rid).eq("status", "APPROVED").order("approved_at", { ascending: false }).limit(1)
      .then(async ({ data: sessions }) => {
        if (sessions && sessions.length > 0) {
          const { data: items } = await supabase.from("inventory_session_items").select("*").eq("session_id", sessions[0].id);
          if (items) {
            setCostData(items.filter(i => i.unit_cost).map(i => ({ item_name: i.item_name, current_stock: i.current_stock, unit_cost: i.unit_cost, total_value: Number(i.current_stock) * Number(i.unit_cost) })).sort((a, b) => b.total_value - a.total_value));
            setConsumptionData(items.map(i => ({ item_name: i.item_name, current_stock: i.current_stock, par_level: i.par_level, gap: Number(i.par_level) - Number(i.current_stock) })).sort((a, b) => b.gap - a.gap));
          }
        }
      });
    supabase.from("usage_events").select("item_name, quantity_used").eq("restaurant_id", rid).then(({ data }) => {
      if (data) {
        const grouped: Record<string, number> = {};
        data.forEach(u => { grouped[u.item_name] = (grouped[u.item_name] || 0) + Number(u.quantity_used); });
        setUsageData(Object.entries(grouped).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total));
      }
    });
  }, [currentRestaurant]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header"><div><h1 className="page-title">Reports</h1><p className="page-description">Analyze costs, usage, and consumption</p></div></div>
      <Tabs defaultValue="cost">
        <TabsList><TabsTrigger value="cost">Cost Analysis</TabsTrigger><TabsTrigger value="usage">Product Usage</TabsTrigger><TabsTrigger value="consumption">Consumption</TabsTrigger></TabsList>
        <TabsContent value="cost" className="mt-4">
          <Card className="overflow-hidden">{costData.length === 0 ? <CardContent className="empty-state py-10"><BarChart3 className="empty-state-icon" /><p className="empty-state-title">No cost data available</p></CardContent> : (
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead className="text-xs font-semibold">Item</TableHead><TableHead className="text-xs font-semibold">Stock</TableHead><TableHead className="text-xs font-semibold">Unit Cost</TableHead><TableHead className="text-xs font-semibold">Total Value</TableHead></TableRow></TableHeader><TableBody>
              {costData.map(i => (<TableRow key={i.item_name}><TableCell className="text-sm font-medium">{i.item_name}</TableCell><TableCell className="font-mono text-sm">{i.current_stock}</TableCell><TableCell className="font-mono text-sm">${i.unit_cost}</TableCell><TableCell className="font-mono text-sm font-bold">${i.total_value.toFixed(2)}</TableCell></TableRow>))}
              <TableRow><TableCell colSpan={3} className="font-bold text-right text-sm">Total</TableCell><TableCell className="font-mono font-bold text-sm">${costData.reduce((s, i) => s + i.total_value, 0).toFixed(2)}</TableCell></TableRow>
            </TableBody></Table>
          )}</Card>
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <Card className="overflow-hidden">{usageData.length === 0 ? <CardContent className="empty-state py-10"><BarChart3 className="empty-state-icon" /><p className="empty-state-title">No usage data</p></CardContent> : (
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead className="text-xs font-semibold">Item</TableHead><TableHead className="text-xs font-semibold">Total Used</TableHead></TableRow></TableHeader><TableBody>
              {usageData.map(i => (<TableRow key={i.name}><TableCell className="text-sm font-medium">{i.name}</TableCell><TableCell className="font-mono text-sm">{i.total}</TableCell></TableRow>))}
            </TableBody></Table>
          )}</Card>
        </TabsContent>
        <TabsContent value="consumption" className="mt-4">
          <Card className="overflow-hidden">{consumptionData.length === 0 ? <CardContent className="empty-state py-10"><BarChart3 className="empty-state-icon" /><p className="empty-state-title">No data</p></CardContent> : (
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead className="text-xs font-semibold">Item</TableHead><TableHead className="text-xs font-semibold">Stock</TableHead><TableHead className="text-xs font-semibold">PAR</TableHead><TableHead className="text-xs font-semibold">Gap</TableHead></TableRow></TableHeader><TableBody>
              {consumptionData.map(i => (<TableRow key={i.item_name}><TableCell className="text-sm font-medium">{i.item_name}</TableCell><TableCell className="font-mono text-sm">{i.current_stock}</TableCell><TableCell className="font-mono text-sm">{i.par_level}</TableCell><TableCell className="font-mono text-sm font-bold">{i.gap}</TableCell></TableRow>))}
            </TableBody></Table>
          )}</Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}