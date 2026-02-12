import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    // Cost analysis from latest approved session
    supabase.from("inventory_sessions").select("id").eq("restaurant_id", rid).eq("status", "APPROVED").order("approved_at", { ascending: false }).limit(1)
      .then(async ({ data: sessions }) => {
        if (sessions && sessions.length > 0) {
          const { data: items } = await supabase.from("inventory_session_items").select("*").eq("session_id", sessions[0].id);
          if (items) {
            setCostData(items.filter(i => i.unit_cost).map(i => ({
              item_name: i.item_name,
              current_stock: i.current_stock,
              unit_cost: i.unit_cost,
              total_value: Number(i.current_stock) * Number(i.unit_cost),
            })).sort((a, b) => b.total_value - a.total_value));

            setConsumptionData(items.map(i => ({
              item_name: i.item_name,
              current_stock: i.current_stock,
              par_level: i.par_level,
              gap: Number(i.par_level) - Number(i.current_stock),
            })).sort((a, b) => b.gap - a.gap));
          }
        }
      });

    // Usage data
    supabase.from("usage_events").select("item_name, quantity_used").eq("restaurant_id", rid)
      .then(({ data }) => {
        if (data) {
          const grouped: Record<string, number> = {};
          data.forEach(u => { grouped[u.item_name] = (grouped[u.item_name] || 0) + Number(u.quantity_used); });
          setUsageData(Object.entries(grouped).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total));
        }
      });
  }, [currentRestaurant]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Tabs defaultValue="cost">
        <TabsList>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          <TabsTrigger value="usage">Product Usage</TabsTrigger>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
        </TabsList>

        <TabsContent value="cost" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Inventory Cost Analysis</CardTitle></CardHeader>
            <CardContent>
              {costData.length === 0 ? <p className="text-sm text-muted-foreground">No cost data available.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Stock</TableHead><TableHead>Unit Cost</TableHead><TableHead>Total Value</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {costData.map(i => (
                      <TableRow key={i.item_name}>
                        <TableCell className="font-medium">{i.item_name}</TableCell>
                        <TableCell className="font-mono">{i.current_stock}</TableCell>
                        <TableCell className="font-mono">${i.unit_cost}</TableCell>
                        <TableCell className="font-mono font-bold">${i.total_value.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold text-right">Total</TableCell>
                      <TableCell className="font-mono font-bold">${costData.reduce((s, i) => s + i.total_value, 0).toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Product Usage</CardTitle></CardHeader>
            <CardContent>
              {usageData.length === 0 ? <p className="text-sm text-muted-foreground">No usage data.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Total Used</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {usageData.map(i => (
                      <TableRow key={i.name}><TableCell className="font-medium">{i.name}</TableCell><TableCell className="font-mono">{i.total}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Consumption Gap (PAR - Stock)</CardTitle></CardHeader>
            <CardContent>
              {consumptionData.length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Stock</TableHead><TableHead>PAR</TableHead><TableHead>Gap</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {consumptionData.map(i => (
                      <TableRow key={i.item_name}>
                        <TableCell className="font-medium">{i.item_name}</TableCell>
                        <TableCell className="font-mono">{i.current_stock}</TableCell>
                        <TableCell className="font-mono">{i.par_level}</TableCell>
                        <TableCell className="font-mono font-bold">{i.gap}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
