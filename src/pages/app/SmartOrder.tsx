import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShoppingCart, Save } from "lucide-react";

export default function SmartOrderPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [computed, setComputed] = useState(false);

  useEffect(() => {
    if (!currentRestaurant) return;
    supabase
      .from("inventory_sessions")
      .select("*, inventory_lists(name)")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("status", "APPROVED")
      .order("approved_at", { ascending: false })
      .then(({ data }) => { if (data) setSessions(data); });
  }, [currentRestaurant]);

  const handleCompute = async () => {
    if (!selectedSession) return;
    const { data } = await supabase.from("inventory_session_items").select("*").eq("session_id", selectedSession);
    if (!data) return;

    const computed = data.map(i => {
      const ratio = Number(i.current_stock) / Math.max(Number(i.par_level), 1);
      return {
        ...i,
        suggestedOrder: Math.max(Number(i.par_level) - Number(i.current_stock), 0),
        risk: ratio < 0.5 ? "RED" : ratio < 1 ? "YELLOW" : "GREEN",
        ratio,
      };
    }).sort((a, b) => b.suggestedOrder - a.suggestedOrder);

    setItems(computed);
    setComputed(true);
  };

  const handleSave = async () => {
    if (!currentRestaurant || !user || !selectedSession) return;
    const { data: run, error } = await supabase.from("smart_order_runs").insert({
      restaurant_id: currentRestaurant.id,
      session_id: selectedSession,
      created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    const runItems = items.map(i => ({
      run_id: run.id,
      item_name: i.item_name,
      suggested_order: i.suggestedOrder,
      risk: i.risk,
      current_stock: i.current_stock,
      par_level: i.par_level,
    }));
    await supabase.from("smart_order_run_items").insert(runItems);
    toast.success("Smart order run saved!");
  };

  const riskBadge = (risk: string) => {
    if (risk === "RED") return <Badge variant="destructive" className="text-[10px]">RED</Badge>;
    if (risk === "YELLOW") return <Badge className="bg-risk-yellow text-foreground text-[10px]">YELLOW</Badge>;
    return <Badge className="bg-risk-green text-primary-foreground text-[10px]">GREEN</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Smart Order</h1>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Select Approved Session</Label>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger><SelectValue placeholder="Choose session" /></SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.inventory_lists?.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCompute} className="bg-gradient-amber gap-2" disabled={!selectedSession}>
            <ShoppingCart className="h-4 w-4" /> Compute Smart Order
          </Button>
        </CardContent>
      </Card>

      {computed && items.length > 0 && (
        <>
          <div className="flex justify-end">
            <Button onClick={handleSave} variant="outline" className="gap-2">
              <Save className="h-4 w-4" /> Save Run
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>PAR</TableHead>
                  <TableHead>Order Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell>{riskBadge(i.risk)}</TableCell>
                    <TableCell className="font-medium">{i.item_name}</TableCell>
                    <TableCell className="font-mono">{i.current_stock}</TableCell>
                    <TableCell className="font-mono">{i.par_level}</TableCell>
                    <TableCell className="font-mono font-bold">{i.suggestedOrder} {i.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
