import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, ClipboardCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ReviewPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [viewItems, setViewItems] = useState<any[] | null>(null);
  const [viewSession, setViewSession] = useState<any>(null);

  const fetchSessions = async () => {
    if (!currentRestaurant) return;
    const { data } = await supabase
      .from("inventory_sessions")
      .select("*, inventory_lists(name)")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("status", "IN_REVIEW")
      .order("updated_at", { ascending: false });
    if (data) setSessions(data);
  };

  useEffect(() => { fetchSessions(); }, [currentRestaurant]);

  const handleApprove = async (sessionId: string) => {
    const { error } = await supabase.from("inventory_sessions").update({
      status: "APPROVED",
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else { toast.success("Session approved!"); fetchSessions(); }
  };

  const handleReject = async (sessionId: string) => {
    const { error } = await supabase.from("inventory_sessions").update({
      status: "IN_PROGRESS",
      updated_at: new Date().toISOString(),
    }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else { toast.success("Session sent back"); fetchSessions(); }
  };

  const handleView = async (session: any) => {
    const { data } = await supabase.from("inventory_session_items").select("*").eq("session_id", session.id);
    setViewItems(data || []);
    setViewSession(session);
  };

  const isManagerOrOwner = currentRestaurant?.role === "OWNER" || currentRestaurant?.role === "MANAGER";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Review Inventory</h1>
          <p className="page-description">Approve or reject submitted inventory counts</p>
        </div>
        {sessions.length > 0 && <Badge variant="secondary" className="text-xs">{sessions.length} pending</Badge>}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <ClipboardCheck className="empty-state-icon" />
            <p className="empty-state-title">No sessions pending review</p>
            <p className="empty-state-description">Sessions submitted by staff will appear here for approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.id} className="hover:shadow-card transition-all duration-200">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.inventory_lists?.name} • {new Date(s.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleView(s)} className="gap-1.5 h-8 text-xs">
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  {isManagerOrOwner && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(s.id)} className="bg-success hover:bg-success/90 gap-1.5 h-8 text-xs">
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(s.id)} className="gap-1.5 h-8 text-xs">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewItems} onOpenChange={() => { setViewItems(null); setViewSession(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewSession?.name} — Items</DialogTitle></DialogHeader>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Item</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Stock</TableHead>
                  <TableHead className="text-xs font-semibold">PAR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewItems?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.item_name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] font-normal">{item.category}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{item.current_stock}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{item.par_level}</TableCell>
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