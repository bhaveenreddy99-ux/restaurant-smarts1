import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Receipt } from "lucide-react";

export default function PurchaseHistoryPage() {
  const { currentRestaurant } = useRestaurant();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [viewItems, setViewItems] = useState<any[] | null>(null);
  const [viewPurchase, setViewPurchase] = useState<any>(null);

  useEffect(() => {
    if (!currentRestaurant) return;
    supabase
      .from("purchase_history")
      .select("*, inventory_lists(name)")
      .eq("restaurant_id", currentRestaurant.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setPurchases(data); });
  }, [currentRestaurant]);

  const handleView = async (purchase: any) => {
    const { data } = await supabase
      .from("purchase_history_items")
      .select("*")
      .eq("purchase_history_id", purchase.id);
    setViewItems(data || []);
    setViewPurchase(purchase);
  };

  const totalCost = (items: any[]) =>
    items.reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Purchase History</h1>

      {purchases.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto h-10 w-10 mb-3 opacity-30" />
          No purchase history yet. Save a Smart Order run to generate one.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {purchases.map(p => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{p.inventory_lists?.name || "Unknown List"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()} • {new Date(p.created_at).toLocaleTimeString()}
                  </p>
                  {p.vendor_name && (
                    <Badge variant="outline" className="mt-1 text-[10px]">{p.vendor_name}</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleView(p)} className="gap-1">
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewItems} onOpenChange={() => { setViewItems(null); setViewPurchase(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Purchase — {viewPurchase?.inventory_lists?.name} — {viewPurchase ? new Date(viewPurchase.created_at).toLocaleDateString() : ""}
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewItems?.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell className="font-mono">{item.quantity}</TableCell>
                  <TableCell className="font-mono">{item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : "—"}</TableCell>
                  <TableCell className="font-mono">{item.total_cost ? `$${Number(item.total_cost).toFixed(2)}` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {viewItems && viewItems.length > 0 && (
            <div className="text-right pt-2 border-t">
              <p className="text-sm font-semibold">
                Estimated Total: <span className="text-primary">${totalCost(viewItems).toFixed(2)}</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
