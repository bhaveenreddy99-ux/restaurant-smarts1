import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShoppingCart, Save, DollarSign, AlertTriangle, Package } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";

export default function SmartOrderPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();

  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [parGuides, setParGuides] = useState<any[]>([]);
  const [selectedPar, setSelectedPar] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [computed, setComputed] = useState(false);

  useEffect(() => {
    if (!currentRestaurant) return;
    supabase.from("inventory_lists").select("*").eq("restaurant_id", currentRestaurant.id)
      .then(({ data }) => { if (data) setLists(data); });
  }, [currentRestaurant]);

  useEffect(() => {
    if (!currentRestaurant || !selectedList) {
      setSessions([]); setParGuides([]); setSelectedSession(""); setSelectedPar("");
      return;
    }
    supabase.from("inventory_sessions")
      .select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", selectedList)
      .eq("status", "APPROVED")
      .order("approved_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSessions(data);
          if (data.length > 0) setSelectedSession(data[0].id);
        }
      });
    supabase.from("par_guides")
      .select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", selectedList)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setParGuides(data);
          if (data.length > 0) setSelectedPar(data[0].id);
        }
      });
    setComputed(false);
    setItems([]);
  }, [currentRestaurant, selectedList]);

  const handleCompute = async () => {
    if (!selectedSession || !selectedPar) return;

    const { data: sessionItems } = await supabase.from("inventory_session_items").select("*").eq("session_id", selectedSession);
    const { data: parItems } = await supabase.from("par_guide_items").select("*").eq("par_guide_id", selectedPar);

    if (!sessionItems || !parItems) return;

    const parMap: Record<string, any> = {};
    parItems.forEach(p => { parMap[p.item_name] = p; });

    const computed = sessionItems.map(i => {
      const par = parMap[i.item_name];
      const parLevel = par ? Number(par.par_level) : Number(i.par_level);
      const currentStock = Number(i.current_stock);
      const ratio = currentStock / Math.max(parLevel, 1);
      return {
        ...i,
        par_level: parLevel,
        suggestedOrder: Math.max(parLevel - currentStock, 0),
        risk: ratio < 0.5 ? "RED" : ratio < 1 ? "YELLOW" : "GREEN",
        ratio,
      };
    }).sort((a, b) => b.suggestedOrder - a.suggestedOrder);

    setItems(computed);
    setComputed(true);
  };

  const handleSave = async () => {
    if (!currentRestaurant || !user || !selectedSession || !selectedPar || !selectedList) return;

    const { data: run, error } = await supabase.from("smart_order_runs").insert({
      restaurant_id: currentRestaurant.id,
      session_id: selectedSession,
      inventory_list_id: selectedList,
      par_guide_id: selectedPar,
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
      unit_cost: i.unit_cost || null,
    }));
    await supabase.from("smart_order_run_items").insert(runItems);

    const { data: ph } = await supabase.from("purchase_history").insert({
      restaurant_id: currentRestaurant.id,
      inventory_list_id: selectedList,
      smart_order_run_id: run.id,
      created_by: user.id,
    }).select().single();

    if (ph) {
      const phItems = items.filter(i => i.suggestedOrder > 0).map(i => ({
        purchase_history_id: ph.id,
        item_name: i.item_name,
        quantity: i.suggestedOrder,
        unit_cost: i.unit_cost || null,
        total_cost: i.unit_cost ? i.suggestedOrder * Number(i.unit_cost) : null,
      }));
      if (phItems.length > 0) {
        await supabase.from("purchase_history_items").insert(phItems);
      }
    }

    toast.success("Smart order saved with purchase history!");
  };

  const riskBadge = (risk: string) => {
    if (risk === "RED") return <Badge variant="destructive" className="text-[10px] font-medium">RED</Badge>;
    if (risk === "YELLOW") return <Badge className="bg-warning text-warning-foreground text-[10px] font-medium">YELLOW</Badge>;
    return <Badge className="bg-success text-success-foreground text-[10px] font-medium">GREEN</Badge>;
  };

  const totalEstCost = items.reduce((sum, i) => sum + (i.unit_cost ? i.suggestedOrder * Number(i.unit_cost) : 0), 0);
  const redCount = items.filter(i => i.risk === "RED").length;
  const orderCount = items.filter(i => i.suggestedOrder > 0).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Order</h1>
          <p className="page-description">Generate purchase orders from approved inventory and PAR levels</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Step 1 — Inventory List</Label>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select list" /></SelectTrigger>
                <SelectContent>{lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Step 2 — Approved Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession} disabled={!selectedList}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Step 3 — PAR Guide</Label>
              <Select value={selectedPar} onValueChange={setSelectedPar} disabled={!selectedList}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select PAR guide" /></SelectTrigger>
                <SelectContent>
                  {parGuides.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCompute} className="bg-gradient-amber shadow-amber gap-2" disabled={!selectedSession || !selectedPar}>
            <ShoppingCart className="h-4 w-4" /> Compute Smart Order
          </Button>
        </CardContent>
      </Card>

      {computed && items.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-destructive/15">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="stat-value text-lg">{redCount}</p>
                  <p className="text-[11px] text-muted-foreground">Critical items</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="stat-value text-lg">{orderCount}</p>
                  <p className="text-[11px] text-muted-foreground">Items to order</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/15">
              <CardContent className="flex items-center gap-3 p-4">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="stat-value text-lg">${totalEstCost.toFixed(2)}</p>
                  <p className="text-[11px] text-muted-foreground">Est. total cost</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <ExportButtons
              items={items.map(i => ({ ...i, suggestedOrder: i.suggestedOrder }))}
              filename="smart-order"
              type="smartorder"
            />
            <Button onClick={handleSave} className="bg-gradient-amber shadow-amber gap-2">
              <Save className="h-4 w-4" /> Save & Create Purchase History
            </Button>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Risk</TableHead>
                  <TableHead className="text-xs font-semibold">Item</TableHead>
                  <TableHead className="text-xs font-semibold">Current</TableHead>
                  <TableHead className="text-xs font-semibold">PAR</TableHead>
                  <TableHead className="text-xs font-semibold">Order Qty</TableHead>
                  <TableHead className="text-xs font-semibold">Est. Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>{riskBadge(i.risk)}</TableCell>
                    <TableCell className="font-medium text-sm">{i.item_name}</TableCell>
                    <TableCell className="font-mono text-sm">{i.current_stock}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{i.par_level}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{i.suggestedOrder} <span className="font-normal text-muted-foreground text-xs">{i.unit}</span></TableCell>
                    <TableCell className="font-mono text-sm">
                      {i.unit_cost ? `$${(i.suggestedOrder * Number(i.unit_cost)).toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {computed && items.length === 0 && (
        <Card>
          <CardContent className="empty-state">
            <ShoppingCart className="empty-state-icon" />
            <p className="empty-state-title">All items are stocked</p>
            <p className="empty-state-description">No items need reordering based on current stock and PAR levels.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}