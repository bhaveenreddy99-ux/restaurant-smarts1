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
import { Plus, BookOpen, Trash2 } from "lucide-react";

export default function PARManagementPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [guides, setGuides] = useState<any[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [newGuide, setNewGuide] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", category: "", unit: "", par_level: 0 });

  const fetchGuides = async () => {
    if (!currentRestaurant) return;
    const { data } = await supabase.from("par_guides").select("*").eq("restaurant_id", currentRestaurant.id).order("created_at", { ascending: false });
    if (data) setGuides(data);
  };

  const fetchItems = async (guideId: string) => {
    const { data } = await supabase.from("par_guide_items").select("*").eq("par_guide_id", guideId);
    if (data) setItems(data);
  };

  useEffect(() => { fetchGuides(); }, [currentRestaurant]);

  const handleCreateGuide = async () => {
    if (!currentRestaurant || !user) return;
    const { error } = await supabase.from("par_guides").insert({ restaurant_id: currentRestaurant.id, name: newGuide, created_by: user.id });
    if (error) toast.error(error.message);
    else { toast.success("PAR guide created"); setNewGuide(""); setGuideOpen(false); fetchGuides(); }
  };

  const handleAddItem = async () => {
    if (!selectedGuide) return;
    const { error } = await supabase.from("par_guide_items").insert({ par_guide_id: selectedGuide.id, ...newItem });
    if (error) toast.error(error.message);
    else { toast.success("Item added"); setNewItem({ item_name: "", category: "", unit: "", par_level: 0 }); setItemOpen(false); fetchItems(selectedGuide.id); }
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("par_guide_items").delete().eq("id", id);
    if (selectedGuide) fetchItems(selectedGuide.id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PAR Management</h1>
        <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-amber gap-2" size="sm"><Plus className="h-4 w-4" /> New Guide</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create PAR Guide</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Guide Name</Label><Input value={newGuide} onChange={e => setNewGuide(e.target.value)} placeholder="Standard PAR" /></div>
              <Button onClick={handleCreateGuide} className="w-full bg-gradient-amber">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
        {guides.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground col-span-3"><BookOpen className="mx-auto h-10 w-10 mb-3 opacity-30" />No PAR guides yet.</CardContent></Card>}
      </div>

      {selectedGuide && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedGuide.name} - Items</h2>
            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Item</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add PAR Item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Item Name</Label><Input value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label>Category</Label><Input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Unit</Label><Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} /></div>
                    <div className="space-y-1"><Label>PAR Level</Label><Input type="number" value={newItem.par_level} onChange={e => setNewItem({ ...newItem, par_level: +e.target.value })} /></div>
                  </div>
                  <Button onClick={handleAddItem} className="w-full bg-gradient-amber">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Unit</TableHead><TableHead>PAR Level</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.item_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.category}</TableCell>
                    <TableCell className="text-xs">{i.unit}</TableCell>
                    <TableCell className="font-mono">{i.par_level}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => handleDeleteItem(i.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
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
