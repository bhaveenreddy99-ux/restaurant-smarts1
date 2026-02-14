import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import {
  Plus, Send, Package, BookOpen, Play, ArrowLeft, Eye, CheckCircle,
  XCircle, ShoppingCart, Copy, Clock, ClipboardCheck, Trash2, ChevronRight, Eraser } from "lucide-react";

const defaultCategories = ["Frozen", "Cooler", "Dry"];

export default function EnterInventoryPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [loading, setLoading] = useState(true);

  // Sessions by status
  const [inProgressSessions, setInProgressSessions] = useState<any[]>([]);
  const [reviewSessions, setReviewSessions] = useState<any[]>([]);
  const [approvedSessions, setApprovedSessions] = useState<any[]>([]);
  const [approvedFilter, setApprovedFilter] = useState("30");

  // Session editor state
  const [activeSession, setActiveSession] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", category: "Cooler", unit: "", current_stock: 0, par_level: 0, unit_cost: 0 });
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // New session dialog
  const [startOpen, setStartOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [selectedPar, setSelectedPar] = useState("");
  const [parGuides, setParGuides] = useState<any[]>([]);
  const [parItems, setParItems] = useState<any[]>([]);

  // View session dialog
  const [viewItems, setViewItems] = useState<any[] | null>(null);
  const [viewSession, setViewSession] = useState<any>(null);

  // Clear entries confirm
  const [clearEntriesSessionId, setClearEntriesSessionId] = useState<string | null>(null);

  // Create Smart Order modal
  const [smartOrderSession, setSmartOrderSession] = useState<any>(null);
  const [smartOrderParGuides, setSmartOrderParGuides] = useState<any[]>([]);
  const [smartOrderSelectedPar, setSmartOrderSelectedPar] = useState("");
  const [smartOrderCreating, setSmartOrderCreating] = useState(false);

  // Fetch lists
  useEffect(() => {
    if (!currentRestaurant) return;
    supabase.from("inventory_lists").select("*").eq("restaurant_id", currentRestaurant.id)
      .then(({ data }) => {
        if (data) {
          setLists(data);
          if (data.length > 0 && !selectedList) setSelectedList(data[0].id);
        }
      });
  }, [currentRestaurant]);

  // Fetch sessions when list changes
  useEffect(() => {
    if (!currentRestaurant) return;
    fetchSessions();
  }, [currentRestaurant, selectedList, approvedFilter]);

  const fetchSessions = async () => {
    if (!currentRestaurant) return;
    setLoading(true);

    const { data: ip } = await supabase.from("inventory_sessions")
      .select("*, inventory_lists(name)")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("status", "IN_PROGRESS")
      .order("updated_at", { ascending: false });
    setInProgressSessions((ip || []).filter((s) => !selectedList || s.inventory_list_id === selectedList));

    const { data: rv } = await supabase.from("inventory_sessions")
      .select("*, inventory_lists(name)")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("status", "IN_REVIEW")
      .order("updated_at", { ascending: false });
    setReviewSessions((rv || []).filter((s) => !selectedList || s.inventory_list_id === selectedList));

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(approvedFilter));
    const { data: ap } = await supabase.from("inventory_sessions")
      .select("*, inventory_lists(name)")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("status", "APPROVED")
      .gte("approved_at", daysAgo.toISOString())
      .order("approved_at", { ascending: false });
    setApprovedSessions((ap || []).filter((s) => !selectedList || s.inventory_list_id === selectedList));

    setLoading(false);
  };

  // PAR guides for selected list
  useEffect(() => {
    if (!currentRestaurant || !selectedList) { setParGuides([]); return; }
    supabase.from("par_guides").select("*").eq("restaurant_id", currentRestaurant.id).eq("inventory_list_id", selectedList)
      .then(({ data }) => { if (data) setParGuides(data); });
  }, [currentRestaurant, selectedList]);

  useEffect(() => {
    if (!selectedPar) { setParItems([]); return; }
    supabase.from("par_guide_items").select("*").eq("par_guide_id", selectedPar).then(({ data }) => { if (data) setParItems(data); });
  }, [selectedPar]);

  // Create session
  const handleCreateSession = async () => {
    if (!currentRestaurant || !user || !selectedList || !sessionName) return;
    const { data, error } = await supabase.from("inventory_sessions").insert({
      restaurant_id: currentRestaurant.id,
      inventory_list_id: selectedList,
      name: sessionName,
      created_by: user.id
    }).select().single();
    if (error) { toast.error(error.message); return; }

    const { data: catItems } = await supabase.from("inventory_catalog_items").select("*")
      .eq("restaurant_id", currentRestaurant.id).eq("inventory_list_id", selectedList);

    const parMap: Record<string, number> = {};
    parItems.forEach((p) => { parMap[p.item_name] = Number(p.par_level); });

    if (catItems && catItems.length > 0) {
      const preItems = catItems.map((ci) => ({
        session_id: data.id,
        item_name: ci.item_name,
        category: ci.category || "Dry",
        unit: ci.unit || "",
        current_stock: 0,
        par_level: parMap[ci.item_name] ?? ci.default_par_level ?? 0,
        unit_cost: ci.default_unit_cost || null,
        vendor_sku: ci.vendor_sku || null,
        pack_size: ci.pack_size || null,
        vendor_name: ci.vendor_name || null
      }));
      await supabase.from("inventory_session_items").insert(preItems);
    } else if (parItems.length > 0) {
      const preItems = parItems.map((p) => ({
        session_id: data.id,
        item_name: p.item_name,
        category: p.category || "Dry",
        unit: p.unit || "",
        current_stock: 0,
        par_level: p.par_level
      }));
      await supabase.from("inventory_session_items").insert(preItems);
    }

    toast.success("Session created — start entering counts");
    setSessionName("");
    setStartOpen(false);
    setSelectedPar("");
    openEditor(data);
  };

  // Open session editor
  const openEditor = async (session: any) => {
    setActiveSession(session);
    const { data } = await supabase.from("inventory_session_items").select("*").eq("session_id", session.id);
    if (data) setItems(data);
    if (currentRestaurant) {
      const { data: cats } = await supabase.from("inventory_catalog_items").select("*")
        .eq("restaurant_id", currentRestaurant.id).eq("inventory_list_id", session.inventory_list_id);
      if (cats) setCatalogItems(cats);
    }
  };

  const handleAddItem = async () => {
    if (!activeSession) return;
    const payload = { session_id: activeSession.id, ...newItem };
    const { data, error } = await supabase.from("inventory_session_items").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    setItems([...items, data]);
    setNewItem({ item_name: "", category: "Cooler", unit: "", current_stock: 0, par_level: 0, unit_cost: 0 });
    setCreateOpen(false);
  };

  const handleAddFromCatalog = async (catalogItem: any) => {
    if (!activeSession) return;
    const payload = {
      session_id: activeSession.id,
      item_name: catalogItem.item_name,
      category: catalogItem.category || "Dry",
      unit: catalogItem.unit || "",
      current_stock: 0,
      par_level: catalogItem.default_par_level || 0,
      unit_cost: catalogItem.default_unit_cost || 0,
      vendor_sku: catalogItem.vendor_sku || null,
      pack_size: catalogItem.pack_size || null,
      vendor_name: catalogItem.vendor_name || null
    };
    const { data, error } = await supabase.from("inventory_session_items").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    setItems([...items, data]);
    toast.success(`Added ${catalogItem.item_name}`);
  };

  const handleUpdateStock = async (id: string, stock: number) => {
    await supabase.from("inventory_session_items").update({ current_stock: stock }).eq("id", id);
    setItems(items.map((i) => i.id === id ? { ...i, current_stock: stock } : i));
  };

  const handleSubmitForReview = async () => {
    if (!activeSession) return;
    const { error } = await supabase.from("inventory_sessions").update({ status: "IN_REVIEW", updated_at: new Date().toISOString() }).eq("id", activeSession.id);
    if (error) toast.error(error.message);
    else { toast.success("Submitted for review!"); setActiveSession(null); setItems([]); fetchSessions(); }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await supabase.from("inventory_session_items").delete().eq("session_id", sessionId);
    const { error } = await supabase.from("inventory_sessions").delete().eq("id", sessionId);
    if (error) toast.error(error.message);
    else { toast.success("Session deleted"); fetchSessions(); }
  };

  // Clear entries: reset current_stock to 0 for all items in session
  const handleClearEntries = async () => {
    if (!clearEntriesSessionId) return;
    const { error } = await supabase.from("inventory_session_items")
      .update({ current_stock: 0 })
      .eq("session_id", clearEntriesSessionId);
    if (error) toast.error(error.message);
    else {
      toast.success("Entries cleared — ready for recount");
      setClearEntriesSessionId(null);
      // If we're in the editor for this session, refresh items
      if (activeSession?.id === clearEntriesSessionId) {
        setItems(items.map(i => ({ ...i, current_stock: 0 })));
      }
    }
  };

  const handleApprove = async (sessionId: string) => {
    const { error } = await supabase.from("inventory_sessions").update({
      status: "APPROVED", approved_at: new Date().toISOString(), approved_by: user?.id, updated_at: new Date().toISOString()
    }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else { toast.success("Session approved!"); fetchSessions(); }
  };

  const handleReject = async (sessionId: string) => {
    const { error } = await supabase.from("inventory_sessions").update({ status: "IN_PROGRESS", updated_at: new Date().toISOString() }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else { toast.success("Session sent back"); fetchSessions(); }
  };

  const handleView = async (session: any) => {
    const { data } = await supabase.from("inventory_session_items").select("*").eq("session_id", session.id);
    setViewItems(data || []);
    setViewSession(session);
  };

  const handleDuplicate = async (session: any) => {
    if (!currentRestaurant || !user) return;
    const { data: newSess, error } = await supabase.from("inventory_sessions").insert({
      restaurant_id: currentRestaurant.id,
      inventory_list_id: session.inventory_list_id,
      name: `${session.name} (copy)`,
      created_by: user.id
    }).select().single();
    if (error) { toast.error(error.message); return; }
    const { data: srcItems } = await supabase.from("inventory_session_items").select("*").eq("session_id", session.id);
    if (srcItems && srcItems.length > 0) {
      const duped = srcItems.map(({ id, session_id, ...rest }) => ({ ...rest, session_id: newSess.id }));
      await supabase.from("inventory_session_items").insert(duped);
    }
    toast.success("Session duplicated");
    fetchSessions();
  };

  // Create Smart Order from approved session — only asks for PAR guide
  const openSmartOrderModal = async (session: any) => {
    setSmartOrderSession(session);
    setSmartOrderSelectedPar("");
    // Fetch PAR guides for this session's inventory list
    if (!currentRestaurant) return;
    const { data } = await supabase.from("par_guides").select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", session.inventory_list_id);
    setSmartOrderParGuides(data || []);
  };

  const handleCreateSmartOrder = async () => {
    if (!smartOrderSession || !smartOrderSelectedPar || !currentRestaurant || !user) return;
    setSmartOrderCreating(true);

    // Compute smart order
    const { data: sessionItems } = await supabase.from("inventory_session_items").select("*").eq("session_id", smartOrderSession.id);
    const { data: parItemsData } = await supabase.from("par_guide_items").select("*").eq("par_guide_id", smartOrderSelectedPar);

    if (!sessionItems) { toast.error("No session items found"); setSmartOrderCreating(false); return; }

    const parMap: Record<string, any> = {};
    (parItemsData || []).forEach(p => { parMap[p.item_name] = p; });

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
      };
    });

    // Save smart order run
    const { data: run, error } = await supabase.from("smart_order_runs").insert({
      restaurant_id: currentRestaurant.id,
      session_id: smartOrderSession.id,
      inventory_list_id: smartOrderSession.inventory_list_id,
      par_guide_id: smartOrderSelectedPar,
      created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); setSmartOrderCreating(false); return; }

    const runItems = computed.map(i => ({
      run_id: run.id,
      item_name: i.item_name,
      suggested_order: i.suggestedOrder,
      risk: i.risk,
      current_stock: i.current_stock,
      par_level: i.par_level,
      unit_cost: i.unit_cost || null,
    }));
    await supabase.from("smart_order_run_items").insert(runItems);

    // Create purchase history
    const { data: ph } = await supabase.from("purchase_history").insert({
      restaurant_id: currentRestaurant.id,
      inventory_list_id: smartOrderSession.inventory_list_id,
      smart_order_run_id: run.id,
      created_by: user.id,
    }).select().single();

    if (ph) {
      const phItems = computed.filter(i => i.suggestedOrder > 0).map(i => ({
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

    toast.success("Smart order created with purchase history!");
    setSmartOrderSession(null);
    setSmartOrderCreating(false);
    navigate(`/app/smart-order?viewRun=${run.id}`);
  };

  const isManagerOrOwner = currentRestaurant?.role === "OWNER" || currentRestaurant?.role === "MANAGER";

  const filteredItems = items.filter((i) => {
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    if (search && !i.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const selectedListName = lists.find((l) => l.id === selectedList)?.name || "";

  if (loading && lists.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  // ─── SESSION EDITOR ────────────────────────────
  if (activeSession) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/app/dashboard">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink className="cursor-pointer" onClick={() => { setActiveSession(null); fetchSessions(); }}>Inventory management</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{activeSession.name}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveSession(null); fetchSessions(); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{activeSession.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedListName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 text-xs h-9" onClick={() => setClearEntriesSessionId(activeSession.id)}>
              <Eraser className="h-3.5 w-3.5" /> Clear entries
            </Button>
            <Button onClick={handleSubmitForReview} className="bg-gradient-amber shadow-amber gap-2" disabled={items.length === 0}>
              <Send className="h-4 w-4" /> Submit for Review
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="max-w-xs h-9" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {[...defaultCategories, ...categories.filter((c) => !defaultCategories.includes(c))].map((c) =>
                <SelectItem key={c} value={c}>{c}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 h-9"><Plus className="h-3.5 w-3.5" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Item Name</Label><Input value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} className="h-10" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Category</Label>
                    <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>{defaultCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Unit</Label><Input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="lbs, packs..." className="h-10" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>Stock</Label><Input type="number" value={newItem.current_stock} onChange={(e) => setNewItem({ ...newItem, current_stock: +e.target.value })} className="h-10" /></div>
                  <div className="space-y-1"><Label>PAR Level</Label><Input type="number" value={newItem.par_level} onChange={(e) => setNewItem({ ...newItem, par_level: +e.target.value })} className="h-10" /></div>
                  <div className="space-y-1"><Label>Unit Cost</Label><Input type="number" value={newItem.unit_cost} onChange={(e) => setNewItem({ ...newItem, unit_cost: +e.target.value })} className="h-10" /></div>
                </div>
                <Button onClick={handleAddItem} className="w-full bg-gradient-amber">Add</Button>
              </div>
            </DialogContent>
          </Dialog>
          {catalogItems.length > 0 &&
            <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 h-9"><BookOpen className="h-3.5 w-3.5" /> From Catalog</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add from Catalog</DialogTitle></DialogHeader>
                <div className="max-h-80 overflow-y-auto space-y-0.5">
                  {catalogItems.map((ci) =>
                    <div key={ci.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{ci.item_name}</p>
                        <p className="text-[11px] text-muted-foreground">{[ci.category, ci.unit, ci.vendor_name].filter(Boolean).join(" · ")}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleAddFromCatalog(ci)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          }
        </div>

        {filteredItems.length === 0 ?
          <Card className="border shadow-sm">
            <CardContent className="empty-state">
              <Package className="empty-state-icon" />
              <p className="empty-state-title">No items yet</p>
              <p className="empty-state-description">Add items manually or from your catalog to start counting.</p>
            </CardContent>
          </Card> :
          <Card className="overflow-hidden border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Item</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Unit</TableHead>
                  <TableHead className="text-xs font-semibold">Current Stock</TableHead>
                  <TableHead className="text-xs font-semibold">PAR Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) =>
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] font-normal">{item.category}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
                    <TableCell>
                      <Input type="number" value={item.current_stock} onChange={(e) => handleUpdateStock(item.id, +e.target.value)} className="w-20 h-8 text-sm font-mono" />
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{item.par_level}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        }

        {/* Clear Entries Confirm */}
        <AlertDialog open={!!clearEntriesSessionId} onOpenChange={(o) => !o && setClearEntriesSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all entries?</AlertDialogTitle>
              <AlertDialogDescription>This will reset all current stock values to 0 for this session. The item rows will be kept so you can recount.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearEntries} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear Entries</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── MAIN DASHBOARD: 3 STACKED CARDS ──────────
  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/app/dashboard">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Inventory management</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold tracking-tight">Inventory management</h1>

      {/* CARD 1: In Progress */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">In progress</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">View by:</span>
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Inventory List" /></SelectTrigger>
              <SelectContent>
                {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {inProgressSessions.length === 0 ?
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No inventory in progress</p>
              <Button className="bg-gradient-amber shadow-amber gap-2" onClick={() => setStartOpen(true)}>
                <Play className="h-4 w-4" /> Start inventory
              </Button>
            </div> :
            <div className="space-y-2">
              {inProgressSessions.map((s) =>
                <div key={s.id} className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/20">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.inventory_lists?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-warning/10 text-warning border-0 text-[10px]">In progress</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(s.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" className="bg-gradient-amber gap-1.5 h-8 text-xs" onClick={() => openEditor(s)}>
                      Continue
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setClearEntriesSessionId(s.id)}>
                      <Eraser className="h-3 w-3" /> Clear
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSession(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          }
        </CardContent>
      </Card>

      {/* CARD 2: Review */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Review</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {reviewSessions.length === 0 ?
            <div className="text-center items-center justify-center flex flex-row py-0">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No inventory</p>
            </div> :
            <div className="space-y-2">
              {reviewSessions.map((s) =>
                <div key={s.id} className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/20">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.inventory_lists?.name} • {new Date(s.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Ready for review</Badge>
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => handleView(s)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    {isManagerOrOwner &&
                      <>
                        <Button size="sm" className="bg-success hover:bg-success/90 gap-1.5 h-8 text-xs text-success-foreground" onClick={() => handleApprove(s.id)}>
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1.5 h-8 text-xs" onClick={() => handleReject(s.id)}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    }
                  </div>
                </div>
              )}
            </div>
          }
        </CardContent>
      </Card>

      {/* CARD 3: Approved */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Approved</CardTitle>
          <Select value={approvedFilter} onValueChange={setApprovedFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pt-0">
          {approvedSessions.length === 0 ?
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No inventory</p>
            </div> :
            <div className="space-y-2">
              {approvedSessions.map((s) =>
                <div key={s.id} className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{s.name}</p>
                      <Badge className="bg-success/10 text-success border-0 text-[10px]">Approved</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.inventory_lists?.name} • {s.approved_at ? new Date(s.approved_at).toLocaleDateString() : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => handleView(s)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => handleDuplicate(s)}>
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </Button>
                    <Button size="sm" className="bg-gradient-amber gap-1.5 h-8 text-xs" onClick={() => openSmartOrderModal(s)}>
                      <ShoppingCart className="h-3.5 w-3.5" /> Create Smart Order
                    </Button>
                  </div>
                </div>
              )}
            </div>
          }
        </CardContent>
      </Card>

      {/* Start Inventory Dialog */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Inventory Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Inventory List</Label>
              <Select value={selectedList} onValueChange={(v) => { setSelectedList(v); setSelectedPar(""); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select list" /></SelectTrigger>
                <SelectContent>{lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PAR Guide (optional)</Label>
              <Select value={selectedPar} onValueChange={setSelectedPar} disabled={!selectedList}>
                <SelectTrigger className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parGuides.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session Name</Label>
              <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="e.g. Monday AM Count" className="h-10" />
            </div>
            <Button onClick={handleCreateSession} className="w-full bg-gradient-amber" disabled={!selectedList || !sessionName}>Start Session</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Smart Order Modal — asks ONLY for PAR guide */}
      <Dialog open={!!smartOrderSession} onOpenChange={(o) => !o && setSmartOrderSession(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Smart Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Session: <span className="font-medium text-foreground">{smartOrderSession?.name}</span></p>
              <p className="text-sm text-muted-foreground">List: <span className="font-medium text-foreground">{smartOrderSession?.inventory_lists?.name}</span></p>
            </div>
            <div className="space-y-2">
              <Label>Select PAR Guide</Label>
              <Select value={smartOrderSelectedPar} onValueChange={setSmartOrderSelectedPar}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Choose PAR guide" /></SelectTrigger>
                <SelectContent>
                  {smartOrderParGuides.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {smartOrderParGuides.length === 0 && (
                <p className="text-xs text-muted-foreground">No PAR guides found for this list. Create one in PAR Management first.</p>
              )}
            </div>
            <Button
              onClick={handleCreateSmartOrder}
              className="w-full bg-gradient-amber"
              disabled={!smartOrderSelectedPar || smartOrderCreating}
            >
              {smartOrderCreating ? "Creating..." : "Create Smart Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Session Dialog */}
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
                {viewItems?.map((item) =>
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.item_name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] font-normal">{item.category}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{item.current_stock}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{item.par_level}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Entries Confirm */}
      <AlertDialog open={!!clearEntriesSessionId} onOpenChange={(o) => !o && setClearEntriesSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all entries?</AlertDialogTitle>
            <AlertDialogDescription>This will reset all current stock values to 0 for this session. The item rows will be kept so you can recount.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearEntries} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear Entries</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
