import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ListChecks, Trash2 } from "lucide-react";

export default function ListManagementPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [newList, setNewList] = useState("");
  const [newItem, setNewItem] = useState({ item_name: "", quantity: 0, unit: "" });

  const fetchLists = async () => {
    if (!currentRestaurant) return;
    const { data } = await supabase.from("custom_lists").select("*").eq("restaurant_id", currentRestaurant.id).order("created_at", { ascending: false });
    if (data) setLists(data);
  };

  const fetchItems = async (id: string) => {
    const { data } = await supabase.from("custom_list_items").select("*").eq("list_id", id);
    if (data) setItems(data);
  };

  useEffect(() => { fetchLists(); }, [currentRestaurant]);

  const handleCreate = async () => {
    if (!currentRestaurant || !user) return;
    const { error } = await supabase.from("custom_lists").insert({ restaurant_id: currentRestaurant.id, name: newList, created_by: user.id });
    if (error) toast.error(error.message);
    else { toast.success("List created"); setNewList(""); setListOpen(false); fetchLists(); }
  };

  const handleAddItem = async () => {
    if (!selected) return;
    const { error } = await supabase.from("custom_list_items").insert({ list_id: selected.id, ...newItem });
    if (error) toast.error(error.message);
    else { setNewItem({ item_name: "", quantity: 0, unit: "" }); setItemOpen(false); fetchItems(selected.id); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">List Management</h1>
        <Dialog open={listOpen} onOpenChange={setListOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-amber gap-2" size="sm"><Plus className="h-4 w-4" /> New List</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create List</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>List Name</Label><Input value={newList} onChange={e => setNewList(e.target.value)} /></div>
              <Button onClick={handleCreate} className="w-full bg-gradient-amber">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {lists.map(l => (
          <Card key={l.id} className={`cursor-pointer hover:shadow-md transition-shadow ${selected?.id === l.id ? "ring-2 ring-primary" : ""}`} onClick={() => { setSelected(l); fetchItems(l.id); }}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{l.name}</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</p></CardContent>
          </Card>
        ))}
        {lists.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground col-span-3"><ListChecks className="mx-auto h-10 w-10 mb-3 opacity-30" />No custom lists yet.</CardContent></Card>}
      </div>

      {selected && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selected.name} - Items</h2>
            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Item Name</Label><Input value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: +e.target.value })} /></div>
                    <div className="space-y-1"><Label>Unit</Label><Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} /></div>
                  </div>
                  <Button onClick={handleAddItem} className="w-full bg-gradient-amber">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.item_name}</TableCell>
                    <TableCell className="font-mono">{i.quantity}</TableCell>
                    <TableCell className="text-xs">{i.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
