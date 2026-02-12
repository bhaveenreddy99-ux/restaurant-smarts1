import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Send, Package, BookOpen } from "lucide-react";

const defaultCategories = ["Frozen", "Cooler", "Dry"];

export default function EnterInventoryPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [parGuides, setParGuides] = useState<any[]>([]);
  const [selectedPar, setSelectedPar] = useState("");
  const [parItems, setParItems] = useState<any[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", category: "Cooler", unit: "", current_stock: 0, par_level: 0, unit_cost: 0 });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    if (!currentRestaurant) return;
    supabase.from("inventory_lists").select("*").eq("restaurant_id", currentRestaurant.id).then(({ data }) => { if (data) setLists(data); });
  }, [currentRestaurant]);

  // Fetch PAR guides + catalog for selected list
  useEffect(() => {
    if (!currentRestaurant || !selectedList) { setParGuides([]); setCatalogItems([]); return; }
    supabase.from("par_guides").select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", selectedList)
      .then(({ data }) => { if (data) setParGuides(data); });

    const isStaff = currentRestaurant.role === "STAFF";
    const catalogSelect = isStaff
      ? "id, restaurant_id, inventory_list_id, item_name, category, unit, pack_size, default_par_level, created_at, updated_at"
      : "*";
    supabase.from("inventory_catalog_items").select(catalogSelect)
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", selectedList)
      .then(({ data }) => { if (data) setCatalogItems(data); });
  }, [currentRestaurant, selectedList]);

  useEffect(() => {
    if (!selectedPar) { setParItems([]); return; }
    supabase.from("par_guide_items").select("*").eq("par_guide_id", selectedPar).then(({ data }) => { if (data) setParItems(data); });
  }, [selectedPar]);

  const handleCreateSession = async () => {
    if (!currentRestaurant || !user || !selectedList || !sessionName) return;
    const { data, error } = await supabase.from("inventory_sessions").insert({
      restaurant_id: currentRestaurant.id,
      inventory_list_id: selectedList,
      name: sessionName,
      created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setSessionId(data.id);

    // Pre-populate from catalog items, overlay PAR levels from selected guide
    const parMap: Record<string, number> = {};
    parItems.forEach(p => { parMap[p.item_name] = Number(p.par_level); });

    if (catalogItems.length > 0) {
      const preItems = catalogItems.map(ci => ({
        session_id: data.id,
        item_name: ci.item_name,
        category: ci.category || "Dry",
        unit: ci.unit || "",
        current_stock: 0,
        par_level: parMap[ci.item_name] ?? ci.default_par_level ?? 0,
        unit_cost: ci.default_unit_cost || null,
        vendor_sku: ci.vendor_sku || null,
        pack_size: ci.pack_size || null,
        vendor_name: ci.vendor_name || null,
      }));
      await supabase.from("inventory_session_items").insert(preItems);
      // Re-fetch to get proper IDs
      const { data: fetched } = await supabase.from("inventory_session_items").select("*").eq("session_id", data.id);
      if (fetched) setItems(fetched);
    } else if (parItems.length > 0) {
      const preItems = parItems.map(p => ({
        session_id: data.id,
        item_name: p.item_name,
        category: p.category || "Dry",
        unit: p.unit || "",
        current_stock: 0,
        par_level: p.par_level,
      }));
      await supabase.from("inventory_session_items").insert(preItems);
      const { data: fetched } = await supabase.from("inventory_session_items").select("*").eq("session_id", data.id);
      if (fetched) setItems(fetched);
    }
    toast.success("Session created");
  };

  const handleAddItem = async () => {
    if (!sessionId) return;
    const payload = { session_id: sessionId, ...newItem };
    const { data, error } = await supabase.from("inventory_session_items").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    setItems([...items, data]);
    setNewItem({ item_name: "", category: "Cooler", unit: "", current_stock: 0, par_level: 0, unit_cost: 0 });
    setCreateOpen(false);
  };

  const handleAddFromCatalog = async (catalogItem: any) => {
    if (!sessionId) return;
    const payload = {
      session_id: sessionId,
      item_name: catalogItem.item_name,
      category: catalogItem.category || "Dry",
      unit: catalogItem.unit || "",
      current_stock: 0,
      par_level: catalogItem.default_par_level || 0,
      unit_cost: catalogItem.default_unit_cost || 0,
      vendor_sku: catalogItem.vendor_sku || null,
      pack_size: catalogItem.pack_size || null,
      vendor_name: catalogItem.vendor_name || null,
    };
    const { data, error } = await supabase.from("inventory_session_items").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    setItems([...items, data]);
    toast.success(`Added ${catalogItem.item_name}`);
  };

  const handleUpdateStock = async (id: string, stock: number) => {
    await supabase.from("inventory_session_items").update({ current_stock: stock }).eq("id", id);
    setItems(items.map(i => i.id === id ? { ...i, current_stock: stock } : i));
  };

  const handleSubmitForReview = async () => {
    if (!sessionId) return;
    const { error } = await supabase.from("inventory_sessions").update({ status: "IN_REVIEW", updated_at: new Date().toISOString() }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else { toast.success("Submitted for review!"); setSessionId(null); setItems([]); setSessionName(""); }
  };

  const filteredItems = items.filter(i => {
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    if (search && !i.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Enter Inventory</h1>

      {!sessionId ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Inventory List</Label>
                <Select value={selectedList} onValueChange={v => { setSelectedList(v); setSelectedPar(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select list" /></SelectTrigger>
                  <SelectContent>{lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PAR Guide (optional)</Label>
                <Select value={selectedPar} onValueChange={setSelectedPar} disabled={!selectedList}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {parGuides.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Session Name</Label>
              <Input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="e.g. Monday AM Count" />
            </div>
            <Button onClick={handleCreateSession} className="bg-gradient-amber" disabled={!selectedList || !sessionName}>
              Start Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="max-w-xs" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {[...defaultCategories, ...categories.filter(c => !defaultCategories.includes(c))].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Item Name</Label><Input value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Category</Label>
                      <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{defaultCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Unit</Label><Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} placeholder="lbs, packs..." /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label>Stock</Label><Input type="number" value={newItem.current_stock} onChange={e => setNewItem({ ...newItem, current_stock: +e.target.value })} /></div>
                    <div className="space-y-1"><Label>PAR Level</Label><Input type="number" value={newItem.par_level} onChange={e => setNewItem({ ...newItem, par_level: +e.target.value })} /></div>
                    <div className="space-y-1"><Label>Unit Cost</Label><Input type="number" value={newItem.unit_cost} onChange={e => setNewItem({ ...newItem, unit_cost: +e.target.value })} /></div>
                  </div>
                  <Button onClick={handleAddItem} className="w-full bg-gradient-amber">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
            {catalogItems.length > 0 && (
              <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1"><BookOpen className="h-3.5 w-3.5" /> From Catalog</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add from Catalog</DialogTitle></DialogHeader>
                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {catalogItems.map(ci => (
                      <div key={ci.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{ci.item_name}</p>
                          <p className="text-xs text-muted-foreground">{[ci.category, ci.unit, ci.vendor_name].filter(Boolean).join(" · ")}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleAddFromCatalog(ci)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <div className="ml-auto">
              <Button onClick={handleSubmitForReview} className="bg-gradient-amber gap-2" disabled={items.length === 0}>
                <Send className="h-4 w-4" /> Submit for Review
              </Button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto h-10 w-10 mb-3 opacity-30" />
              No items yet. Add items to start counting.
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>PAR Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{item.category}</span></TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.current_stock}
                          onChange={e => handleUpdateStock(item.id, +e.target.value)}
                          className="w-20 h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-sm font-mono">{item.par_level}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
