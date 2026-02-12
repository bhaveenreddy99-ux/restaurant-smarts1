import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Upload, ClipboardList, Package, Download } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";

export default function InventoryListsPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<any[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [exportListId, setExportListId] = useState<string | null>(null);
  const [exportItems, setExportItems] = useState<any[]>([]);

  const fetchLists = async () => {
    if (!currentRestaurant) return;
    const { data } = await supabase
      .from("inventory_lists")
      .select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .order("created_at", { ascending: false });
    if (data) {
      setLists(data);
      // Fetch item counts per list
      const { data: catalogItems } = await supabase
        .from("inventory_catalog_items")
        .select("inventory_list_id")
        .eq("restaurant_id", currentRestaurant.id);
      if (catalogItems) {
        const counts: Record<string, number> = {};
        catalogItems.forEach(i => {
          if (i.inventory_list_id) {
            counts[i.inventory_list_id] = (counts[i.inventory_list_id] || 0) + 1;
          }
        });
        setItemCounts(counts);
      }
    }
  };

  useEffect(() => { fetchLists(); }, [currentRestaurant]);

  const handleCreate = async () => {
    if (!currentRestaurant || !user || !newName.trim()) return;
    const { error } = await supabase.from("inventory_lists").insert({
      restaurant_id: currentRestaurant.id,
      name: newName.trim(),
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("List created"); setNewName(""); setOpen(false); fetchLists(); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Lists Management</h1>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-amber gap-2" size="sm"><Plus className="h-4 w-4" /> Create List</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Inventory List</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>List Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Main Kitchen" />
                </div>
                <Button onClick={handleCreate} className="w-full bg-gradient-amber">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {lists.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-30" />
          No inventory lists yet. Create your first one.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map(list => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{list.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  {itemCounts[list.id] || 0} catalog items
                </div>
                <p className="text-xs text-muted-foreground">Created {new Date(list.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 flex-1"
                    onClick={() => navigate(`/app/inventory/import/${list.id}`)}
                  >
                    <Upload className="h-3.5 w-3.5" /> Import
                  </Button>
                  <ExportButtons
                    items={exportListId === list.id ? exportItems : []}
                    filename={`inventory-${list.name}`}
                    type="inventory"
                    meta={{ listName: list.name }}
                  />
                  {exportListId !== list.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={async () => {
                        const { data } = await supabase
                          .from("inventory_catalog_items")
                          .select("*")
                          .eq("inventory_list_id", list.id);
                        if (data) {
                          setExportItems(data);
                          setExportListId(list.id);
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
