import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";

export default function ApprovedPage() {
  const { currentRestaurant } = useRestaurant();
  const [sessions, setSessions] = useState<any[]>([]);
  const [viewItems, setViewItems] = useState<any[] | null>(null);
  const [viewSession, setViewSession] = useState<any>(null);

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

  const handleView = async (session: any) => {
    const { data } = await supabase.from("inventory_session_items").select("*").eq("session_id", session.id);
    setViewItems(data || []);
    setViewSession(session);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Approved Inventory</h1>

      {sessions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <CheckCircle className="mx-auto h-10 w-10 mb-3 opacity-30" />
          No approved sessions yet.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.inventory_lists?.name} • Approved {s.approved_at ? new Date(s.approved_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleView(s)} className="gap-1">
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewItems} onOpenChange={() => { setViewItems(null); setViewSession(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{viewSession?.name}</DialogTitle>
              {viewItems && viewItems.length > 0 && (
                <ExportButtons
                  items={viewItems}
                  filename={`inventory-${viewSession?.name || "export"}`}
                  type="inventory"
                  meta={{
                    listName: viewSession?.inventory_lists?.name,
                    sessionName: viewSession?.name,
                    date: viewSession?.approved_at ? new Date(viewSession.approved_at).toLocaleDateString() : undefined,
                  }}
                />
              )}
            </div>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>PAR</TableHead><TableHead>Unit Cost</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {viewItems?.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="font-mono">{item.current_stock}</TableCell>
                  <TableCell className="font-mono">{item.par_level}</TableCell>
                  <TableCell className="font-mono">{item.unit_cost ? `$${item.unit_cost}` : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
