import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, BookOpen, Trash2, Save } from "lucide-react";

export default function PARManagementPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [guides, setGuides] = useState<any[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [newGuide, setNewGuide] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  // Fetch inventory lists
  useEffect(() => {
    if (!currentRestaurant) return;
    supabase.from("inventory_lists").select("*").eq("restaurant_id", currentRestaurant.id)
      .then(({ data }) => { if (data) setLists(data); });
  }, [currentRestaurant]);

  // Fetch PAR guides for selected list
  useEffect(() => {
    if (!currentRestaurant || !selectedList) { setGuides([]); setSelectedGuide(null); return; }
    supabase.from("par_guides").select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", selectedList)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setGuides(data); });
    // Fetch catalog items for this list
    supabase.from("inventory_catalog_items").select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", selectedList)
      .then(({ data }) => { if (data) setCatalogItems(data); });
  }, [currentRestaurant, selectedList]);

  const fetchItems = async (guideId: string) => {
    const { data } = await supabase.from("par_guide_items").select("*").eq("par_guide_id", guideId);
    if (data) setItems(data);
  };

  const handleCreateGuide = async () => {
    if (!currentRestaurant || !user || !selectedList || !newGuide.trim()) return;
    const { data, error } = await supabase.from("par_guides").insert({
      restaurant_id: currentRestaurant.id,
      inventory_list_id: selectedList,
      name: newGuide.trim(),
      created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    // Pre-populate from catalog items
    if (catalogItems.length > 0) {
      const parItems = catalogItems.map(ci => ({
        par_guide_id: data.id,
        item_name: ci.item_name,
        category: ci.category,
        unit: ci.unit,
        par_level: ci.default_par_level || 0,
      }));
      await supabase.from("par_guide_items").insert(parItems);
    }

    toast.success("PAR guide created");
    setNewGuide("");
    setGuideOpen(false);
    // Refresh
    const { data: refreshed } = await supabase.from("par_guides").select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("inventory_list_id", selectedList)
      .order("created_at", { ascending: false });
    if (refreshed) setGuides(refreshed);
    setSelectedGuide(data);
    fetchItems(data.id);
  };

  const handleParLevelChange = async (itemId: string, newLevel: number) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, par_level: newLevel } : i));
  };

  const handleSaveParLevels = async () => {
    for (const item of items) {
      await supabase.from("par_guide_items").update({ par_level: item.par_level }).eq("id", item.id);
    }
    toast.success("PAR levels saved");
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("par_guide_items").delete().eq("id", id);
    if (selectedGuide) fetchItems(selectedGuide.id);
  };

  const isManagerOrOwner = currentRestaurant?.role === "OWNER" || currentRestaurant?.role === "MANAGER";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PAR Management</h1>
      </div>

      {/* List selector */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>View by Inventory List</Label>
              <Select value={selectedList} onValueChange={v => { setSelectedList(v); setSelectedGuide(null); setItems([]); }}>
                <SelectTrigger><SelectValue placeholder="Select list" /></SelectTrigger>
                <SelectContent>{lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedList && isManagerOrOwner && (
              <div className="flex items-end">
                <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-amber gap-2" size="sm"><Plus className="h-4 w-4" /> New PAR Guide</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create PAR Guide</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Guide Name</Label>
                        <Input value={newGuide} onChange={e => setNewGuide(e.target.value)} placeholder="e.g. Weekday PAR" />
                      </div>
                      <p className="text-xs text-muted-foreground">Items from the catalog will be pre-populated with default PAR levels.</p>
                      <Button onClick={handleCreateGuide} className="w-full bg-gradient-amber">Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guide cards */}
      {selectedList && (
        <div className="grid gap-4 sm:grid-cols-3">
          {guides.map(g => (
            <Card
              key={g.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${selectedGuide?.id === g.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => { setSelectedGuide(g); fetchItems(g.id); }}
            >
              <CardHeader className="pb-2"><CardTitle className="text-base">{g.name}</CardTitle></CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</p></CardContent>
            </Card>
          ))}
          {guides.length === 0 && (
            <Card className="col-span-3"><CardContent className="py-8 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-10 w-10 mb-3 opacity-30" />No PAR guides for this list yet.
            </CardContent></Card>
          )}
        </div>
      )}

      {/* PAR items editor */}
      {selectedGuide && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedGuide.name} - Items</h2>
            {isManagerOrOwner && items.length > 0 && (
              <Button size="sm" variant="outline" className="gap-1" onClick={handleSaveParLevels}>
                <Save className="h-3.5 w-3.5" /> Save PAR Levels
              </Button>
            )}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>PAR Level</TableHead>
                  {isManagerOrOwner && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.item_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.category}</TableCell>
                    <TableCell className="text-xs">{i.unit}</TableCell>
                    <TableCell>
                      {isManagerOrOwner ? (
                        <Input
                          type="number"
                          value={i.par_level}
                          onChange={e => handleParLevelChange(i.id, +e.target.value)}
                          className="w-20 h-8 text-sm"
                        />
                      ) : (
                        <span className="font-mono">{i.par_level}</span>
                      )}
                    </TableCell>
                    {isManagerOrOwner && (
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(i.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No items in this PAR guide.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
