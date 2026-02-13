import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, ShoppingCart } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";
import { useNavigate } from "react-router-dom";

export default function ApprovedPage() {
  const { currentRestaurant } = useRestaurant();
  const navigate = useNavigate();
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
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approved Inventory</h1>
          <p className="page-description">Finalized inventory sessions ready for ordering</p>
        </div>
        {sessions.length > 0 && (
          <Button size="sm" className="bg-gradient-amber shadow-amber gap-1.5" onClick={() => navigate("/app/smart-order")}>
            <ShoppingCart className="h-3.5 w-3.5" /> Create Smart Order
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <CheckCircle className="empty-state-icon" />
            <p className="empty-state-title">No approved sessions yet</p>
            <p className="empty-state-description">Approved inventory sessions will appear here and power Smart Order.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.id} className="hover:shadow-card transition-all duration-200">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{s.name}</p>
                    <Badge className="bg-success/10 text-success text-[10px] font-medium border-0">Approved</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {s.inventory_lists?.name} • {s.approved_at ? new Date(s.approved_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleView(s)} className="gap-1.5 h-8 text-xs">
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
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Item</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Stock</TableHead>
                  <TableHead className="text-xs font-semibold">PAR</TableHead>
                  <TableHead className="text-xs font-semibold">Unit Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewItems?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.item_name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] font-normal">{item.category}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{item.current_stock}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{item.par_level}</TableCell>
                    <TableCell className="font-mono text-sm">{item.unit_cost ? `$${item.unit_cost}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}