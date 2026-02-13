import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Receipt, DollarSign } from "lucide-react";

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
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase History</h1>
          <p className="page-description">Track saved Smart Order runs and procurement costs</p>
        </div>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <Receipt className="empty-state-icon" />
            <p className="empty-state-title">No purchase history yet</p>
            <p className="empty-state-description">Save a Smart Order run to automatically generate purchase history.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {purchases.map(p => (
            <Card key={p.id} className="hover:shadow-card transition-all duration-200">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-sm">{p.inventory_lists?.name || "Unknown List"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(p.created_at).toLocaleDateString()} • {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {p.vendor_name && (
                    <Badge variant="outline" className="mt-1.5 text-[10px]">{p.vendor_name}</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleView(p)} className="gap-1.5 h-8 text-xs">
                  <Eye className="h-3.5 w-3.5" /> Details
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
              {viewPurchase?.inventory_lists?.name} — {viewPurchase ? new Date(viewPurchase.created_at).toLocaleDateString() : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Item</TableHead>
                  <TableHead className="text-xs font-semibold">Quantity</TableHead>
                  <TableHead className="text-xs font-semibold">Unit Cost</TableHead>
                  <TableHead className="text-xs font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewItems?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.quantity}</TableCell>
                    <TableCell className="font-mono text-sm">{item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{item.total_cost ? `$${Number(item.total_cost).toFixed(2)}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {viewItems && viewItems.length > 0 && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <DollarSign className="h-4 w-4 text-primary" />
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