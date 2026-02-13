import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Upload, ClipboardList, Package, Download, FileText, History, ChevronDown, ChevronUp } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";

export default function InventoryListsPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<any[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [importFiles, setImportFiles] = useState<Record<string, any[]>>({});
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [exportListId, setExportListId] = useState<string | null>(null);
  const [exportItems, setExportItems] = useState<any[]>([]);
  const [historyListId, setHistoryListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLists = async () => {
    if (!currentRestaurant) return;
    setLoading(true);
    const { data } = await supabase
      .from("inventory_lists")
      .select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .order("created_at", { ascending: false });
    if (data) {
      setLists(data);
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
      const { data: imports } = await supabase
        .from("inventory_import_files")
        .select("*")
        .eq("restaurant_id", currentRestaurant.id)
        .order("uploaded_at", { ascending: false });
      if (imports) {
        const grouped: Record<string, any[]> = {};
        imports.forEach(f => {
          if (!grouped[f.inventory_list_id]) grouped[f.inventory_list_id] = [];
          grouped[f.inventory_list_id].push(f);
        });
        setImportFiles(grouped);
      }
    }
    setLoading(false);
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

  const getLastImportDate = (listId: string) => {
    const files = importFiles[listId];
    if (!files || files.length === 0) return null;
    return new Date(files[0].uploaded_at);
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-7 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Lists</h1>
          <p className="page-description">Manage your master inventory catalogs</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-amber gap-2 shadow-amber" size="sm"><Plus className="h-4 w-4" /> Create List</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Inventory List</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>List Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Main Kitchen" className="h-10" />
              </div>
              <Button onClick={handleCreate} className="w-full bg-gradient-amber">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <ClipboardList className="empty-state-icon" />
            <p className="empty-state-title">No inventory lists yet</p>
            <p className="empty-state-description">Create your first inventory list or import from a CSV/Excel file to get started.</p>
            <Button className="mt-4 bg-gradient-amber gap-2" size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map(list => {
            const lastImport = getLastImportDate(list.id);
            const listImports = importFiles[list.id] || [];
            const count = itemCounts[list.id] || 0;
            return (
              <Card key={list.id} className="group hover:shadow-card transition-all duration-200 overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[15px]">{list.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(list.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-mono">{count} items</Badge>
                  </div>

                  {lastImport && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      Last import: {lastImport.toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 flex-1 h-8 text-xs"
                      onClick={() => navigate(`/app/inventory/import/${list.id}`)}
                    >
                      <Upload className="h-3 w-3" /> Import
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
                        className="gap-1.5 h-8 text-xs"
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
                        <Download className="h-3 w-3" /> Export
                      </Button>
                    )}
                  </div>

                  {listImports.length > 0 && (
                    <div>
                      <button
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setHistoryListId(historyListId === list.id ? null : list.id)}
                      >
                        <History className="h-3 w-3" />
                        {listImports.length} import{listImports.length > 1 ? "s" : ""}
                        {historyListId === list.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {historyListId === list.id && (
                        <div className="mt-2 rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-[11px] h-8">File</TableHead>
                                <TableHead className="text-[11px] h-8">Date</TableHead>
                                <TableHead className="text-[11px] h-8 text-right">Rows</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {listImports.slice(0, 5).map(f => (
                                <TableRow key={f.id}>
                                  <TableCell className="text-[11px] py-1.5 truncate max-w-[100px]">{f.file_name}</TableCell>
                                  <TableCell className="text-[11px] py-1.5">{new Date(f.uploaded_at).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-[11px] py-1.5 font-mono text-right">{f.row_count}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}