import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, ArrowRight, Save, CheckCircle, AlertTriangle } from "lucide-react";
import {
  VENDOR_PRESETS,
  CANONICAL_FIELDS,
  detectVendor,
  autoMapColumns,
  validateNumericField,
  type CanonicalField,
  type VendorPreset,
} from "@/lib/vendor-presets";
import { parseFile } from "@/lib/export-utils";

type Step = "upload" | "mapping" | "preview" | "done";

export default function ImportPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  // Mapping state
  const [vendor, setVendor] = useState<VendorPreset>(VENDOR_PRESETS.find(p => p.id === "generic")!);
  const [mapping, setMapping] = useState<Record<CanonicalField, string | null>>({} as any);

  // Import destination
  const [destination, setDestination] = useState<"catalog" | "session">("catalog");
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [submitToReview, setSubmitToReview] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateName, setTemplateName] = useState("");

  // Validation warnings
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!currentRestaurant) return;
    supabase.from("inventory_lists").select("*").eq("restaurant_id", currentRestaurant.id).then(({ data }) => { if (data) setLists(data); });
    supabase.from("import_templates").select("*").eq("restaurant_id", currentRestaurant.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setTemplates(data); });
  }, [currentRestaurant]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      const { headers: h, rows: r } = await parseFile(f);
      if (h.length === 0) { toast.error("No data found in file"); return; }
      setHeaders(h);
      setRows(r);

      const detected = detectVendor(h);
      setVendor(detected);
      const autoMapped = autoMapColumns(h, detected);
      setMapping(autoMapped);
      setStep("mapping");
      if (detected.id !== "generic") {
        toast.success(`Detected vendor: ${detected.label}`);
      }
    } catch {
      toast.error("Failed to parse file");
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    const mj = tmpl.mapping_json as Record<string, string | null>;
    setMapping(mj as Record<CanonicalField, string | null>);
    const vp = VENDOR_PRESETS.find(p => p.id === tmpl.vendor_name || p.label === tmpl.vendor_name);
    if (vp) setVendor(vp);
    toast.success("Template applied");
  };

  const handleVendorChange = (vendorId: string) => {
    const vp = VENDOR_PRESETS.find(p => p.id === vendorId)!;
    setVendor(vp);
    const autoMapped = autoMapColumns(headers, vp);
    setMapping(autoMapped);
  };

  const handleMappingChange = (field: CanonicalField, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value === "__none__" ? null : value }));
  };

  const handleProceedToPreview = () => {
    if (!mapping.item_name) {
      toast.error("item_name mapping is required");
      return;
    }
    if (destination === "session" && !selectedList) {
      toast.error("Select an inventory list for session import");
      return;
    }
    // Validate numeric fields
    const w: string[] = [];
    const numericFields: CanonicalField[] = ["currentStock", "parLevel", "leadTimeDays", "unitCost"];
    for (const field of numericFields) {
      const col = mapping[field];
      if (!col) continue;
      let invalidCount = 0;
      for (const row of rows.slice(0, 100)) {
        const v = row[col];
        if (v !== "" && v != null && isNaN(Number(v))) invalidCount++;
      }
      if (invalidCount > 0) {
        w.push(`${CANONICAL_FIELDS.find(f => f.key === field)?.label}: ${invalidCount} non-numeric values in first 100 rows`);
      }
    }
    setWarnings(w);
    setStep("preview");
  };

  const getMappedValue = (row: Record<string, any>, field: CanonicalField): any => {
    const col = mapping[field];
    if (!col) return null;
    return row[col] ?? null;
  };

  const handleImport = async () => {
    if (!currentRestaurant || !user) return;
    setImporting(true);
    try {
      const mappedFields = CANONICAL_FIELDS.map(f => f.key).filter(k => mapping[k]);
      const extraCols = headers.filter(h => !Object.values(mapping).includes(h));

      if (destination === "catalog") {
        const catalogItems = rows.map(row => {
          const metadata: Record<string, any> = {};
          for (const col of extraCols) {
            if (row[col] !== "" && row[col] != null) metadata[col] = row[col];
          }
          return {
            restaurant_id: currentRestaurant.id,
            inventory_list_id: selectedList || null,
            item_name: String(getMappedValue(row, "item_name") || "").trim(),
            vendor_sku: getMappedValue(row, "vendor_sku")?.toString() || null,
            category: getMappedValue(row, "category")?.toString() || null,
            unit: getMappedValue(row, "unit")?.toString() || null,
            pack_size: getMappedValue(row, "pack_size")?.toString() || null,
            default_par_level: validateNumericField(getMappedValue(row, "parLevel")).parsed,
            default_unit_cost: validateNumericField(getMappedValue(row, "unitCost")).parsed,
            vendor_name: getMappedValue(row, "vendor_name")?.toString() || vendor.defaultVendorName || null,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          };
        }).filter(i => i.item_name);

        // Batch insert in chunks of 500
        for (let i = 0; i < catalogItems.length; i += 500) {
          const chunk = catalogItems.slice(i, i + 500);
          const { error } = await supabase.from("inventory_catalog_items").insert(chunk);
          if (error) { toast.error(error.message); setImporting(false); return; }
        }
        toast.success(`Imported ${catalogItems.length} items to catalog`);
      } else {
        // Create session
        const { data: session, error: sessErr } = await supabase.from("inventory_sessions").insert({
          restaurant_id: currentRestaurant.id,
          inventory_list_id: selectedList,
          name: sessionName || `Import ${new Date().toLocaleDateString()}`,
          created_by: user.id,
          status: submitToReview ? "IN_REVIEW" : "IN_PROGRESS",
        }).select().single();
        if (sessErr || !session) { toast.error(sessErr?.message || "Failed to create session"); setImporting(false); return; }

        const sessionItems = rows.map(row => {
          const metadata: Record<string, any> = {};
          for (const col of extraCols) {
            if (row[col] !== "" && row[col] != null) metadata[col] = row[col];
          }
          return {
            session_id: session.id,
            item_name: String(getMappedValue(row, "item_name") || "").trim(),
            vendor_sku: getMappedValue(row, "vendor_sku")?.toString() || null,
            category: getMappedValue(row, "category")?.toString() || null,
            unit: getMappedValue(row, "unit")?.toString() || null,
            pack_size: getMappedValue(row, "pack_size")?.toString() || null,
            current_stock: validateNumericField(getMappedValue(row, "currentStock")).parsed || 0,
            par_level: validateNumericField(getMappedValue(row, "parLevel")).parsed || 0,
            lead_time_days: validateNumericField(getMappedValue(row, "leadTimeDays")).parsed,
            unit_cost: validateNumericField(getMappedValue(row, "unitCost")).parsed,
            vendor_name: getMappedValue(row, "vendor_name")?.toString() || vendor.defaultVendorName || null,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          };
        }).filter(i => i.item_name);

        for (let i = 0; i < sessionItems.length; i += 500) {
          const chunk = sessionItems.slice(i, i + 500);
          const { error } = await supabase.from("inventory_session_items").insert(chunk);
          if (error) { toast.error(error.message); setImporting(false); return; }
        }
        toast.success(`Imported ${sessionItems.length} items into session${submitToReview ? " (submitted for review)" : ""}`);
      }
      setStep("done");
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    }
    setImporting(false);
  };

  const handleSaveTemplate = async () => {
    if (!currentRestaurant || !templateName.trim()) { toast.error("Enter a template name"); return; }
    const { error } = await supabase.from("import_templates").insert({
      restaurant_id: currentRestaurant.id,
      name: templateName.trim(),
      vendor_name: vendor.id,
      file_type: file?.name.endsWith(".xlsx") ? "xlsx" : "csv",
      mapping_json: mapping,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Template saved");
    setTemplateName("");
    // Refresh templates
    const { data } = await supabase.from("import_templates").select("*").eq("restaurant_id", currentRestaurant.id).order("created_at", { ascending: false });
    if (data) setTemplates(data);
  };

  const previewRows = rows.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Import Inventory</h1>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload File</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Apply Saved Template (optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleApplyTemplate}>
                  <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.vendor_name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Select CSV or Excel file</Label>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
            </div>
            <p className="text-xs text-muted-foreground">Supported: Sysco, US Foods, Performance Foodservice, Restaurant365, or generic CSV/XLSX.</p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Column Mapping</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vendor Detected</Label>
                  <Select value={vendor.id} onValueChange={handleVendorChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VENDOR_PRESETS.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Import Destination</Label>
                  <Select value={destination} onValueChange={v => setDestination(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="catalog">Inventory Catalog (master list)</SelectItem>
                      <SelectItem value="session">Inventory Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(destination === "session" || destination === "catalog") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Inventory List</Label>
                    <Select value={selectedList} onValueChange={setSelectedList}>
                      <SelectTrigger><SelectValue placeholder="Select list" /></SelectTrigger>
                      <SelectContent>{lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {destination === "session" && (
                    <div className="space-y-2">
                      <Label>Session Name</Label>
                      <Input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="e.g. Sysco Weekly Import" />
                    </div>
                  )}
                </div>
              )}

              {destination === "session" && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={submitToReview} onCheckedChange={v => setSubmitToReview(!!v)} id="submit-review" />
                  <Label htmlFor="submit-review" className="text-sm">Submit session to Review after import</Label>
                </div>
              )}

              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Map your file columns to app fields:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CANONICAL_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center gap-2">
                      <Label className="w-32 text-xs shrink-0">
                        {field.label}
                        {field.required && <span className="text-destructive ml-0.5">*</span>}
                      </Label>
                      <Select
                        value={mapping[field.key] || "__none__"}
                        onValueChange={v => handleMappingChange(field.key, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Not mapped —</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mapping[field.key] && (
                        <Badge variant="outline" className="text-[10px] shrink-0 text-green-600 border-green-300">✓</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save template */}
              <div className="flex items-end gap-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Save mapping as template</Label>
                  <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Sysco Weekly Export" className="h-8 text-sm" />
                </div>
                <Button size="sm" variant="outline" onClick={handleSaveTemplate} disabled={!templateName.trim()} className="gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setHeaders([]); setRows([]); }}>Back</Button>
                <Button onClick={handleProceedToPreview} className="bg-gradient-amber gap-2">
                  <ArrowRight className="h-4 w-4" /> Preview & Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {warnings.length > 0 && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="py-3 space-y-1">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {w}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Preview ({rows.length} total rows) — importing to {destination === "catalog" ? "Catalog" : "Session"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {CANONICAL_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <TableHead key={f.key} className="text-xs">{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {CANONICAL_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <TableCell key={f.key} className="text-xs py-1.5">
                            {getMappedValue(row, f.key)?.toString() || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 10 && <p className="text-xs text-muted-foreground mt-2">Showing first 10 of {rows.length} rows</p>}
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep("mapping")}>Back</Button>
            <Button onClick={handleImport} className="bg-gradient-amber gap-2" disabled={importing}>
              {importing ? "Importing..." : `Import ${rows.length} Items`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">Import Complete!</p>
            <p className="text-sm text-muted-foreground">{rows.length} items imported successfully.</p>
            <Button onClick={() => { setStep("upload"); setFile(null); setHeaders([]); setRows([]); setWarnings([]); }} variant="outline">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
