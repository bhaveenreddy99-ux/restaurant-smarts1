import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Truck } from "lucide-react";

export default function OrdersPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<{ item_name: string; quantity: number; unit: string }[]>([]);
  const [newItem, setNewItem] = useState({ item_name: "", quantity: 0, unit: "" });
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const fetchOrders = async () => {
    if (!currentRestaurant) return;
    const { data } = await supabase.from("orders").select("*").eq("restaurant_id", currentRestaurant.id).order("created_at", { ascending: false });
    if (data) setOrders(data);
  };

  useEffect(() => { fetchOrders(); }, [currentRestaurant]);

  const handleAddItem = () => {
    if (!newItem.item_name) return;
    setOrderItems([...orderItems, { ...newItem }]);
    setNewItem({ item_name: "", quantity: 0, unit: "" });
  };

  const handleCreateOrder = async () => {
    if (!currentRestaurant || !user || orderItems.length === 0) return;
    const { data: order, error } = await supabase.from("orders").insert({
      restaurant_id: currentRestaurant.id,
      created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    const items = orderItems.map(i => ({ order_id: order.id, ...i }));
    await supabase.from("order_items").insert(items);

    // Create usage events
    const usageEvents = orderItems.map(i => ({
      restaurant_id: currentRestaurant.id,
      item_name: i.item_name,
      order_id: order.id,
      quantity_used: i.quantity,
    }));
    await supabase.from("usage_events").insert(usageEvents);

    toast.success("Order created");
    setOrderItems([]);
    setOrderOpen(false);
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, status: "PENDING" | "PREP" | "READY" | "COMPLETED" | "CANCELED") => {
    await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
    fetchOrders();
  };

  const handleViewOrder = async (order: any) => {
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setViewItems(data || []);
    setViewOrder(order);
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: "secondary", PREP: "default", READY: "default", COMPLETED: "default", CANCELED: "destructive" };
    return (map[s] || "secondary") as any;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-amber gap-2" size="sm"><Plus className="h-4 w-4" /> New Order</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Order</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Input value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} placeholder="Item" />
                <Input type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: +e.target.value })} placeholder="Qty" />
                <div className="flex gap-1">
                  <Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} placeholder="Unit" />
                  <Button size="sm" variant="outline" onClick={handleAddItem}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {orderItems.length > 0 && (
                <div className="space-y-1 text-sm">
                  {orderItems.map((i, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                      <span>{i.item_name}</span>
                      <span className="font-mono">{i.quantity} {i.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={handleCreateOrder} className="w-full bg-gradient-amber" disabled={orderItems.length === 0}>Create Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Truck className="mx-auto h-10 w-10 mb-3 opacity-30" />No orders yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="cursor-pointer" onClick={() => handleViewOrder(o)}>
                  <p className="font-mono text-sm">{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColor(o.status)} className="text-[10px]">{o.status}</Badge>
                  {o.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(o.id, "COMPLETED")}>Complete</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewOrder} onOpenChange={() => { setViewOrder(null); setViewItems([]); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order {viewOrder?.id.slice(0, 8)}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
            <TableBody>
              {viewItems.map(i => (
                <TableRow key={i.id}><TableCell>{i.item_name}</TableCell><TableCell className="font-mono">{i.quantity}</TableCell><TableCell>{i.unit}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
