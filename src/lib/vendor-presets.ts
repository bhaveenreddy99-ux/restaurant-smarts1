// Canonical fields for inventory import
export type CanonicalField =
  | "item_name"
  | "vendor_sku"
  | "category"
  | "unit"
  | "pack_size"
  | "currentStock"
  | "parLevel"
  | "leadTimeDays"
  | "unitCost"
  | "vendor_name";

export const CANONICAL_FIELDS: { key: CanonicalField; label: string; required?: boolean; numeric?: boolean }[] = [
  { key: "item_name", label: "Item Name", required: true },
  { key: "vendor_sku", label: "Vendor SKU" },
  { key: "category", label: "Category" },
  { key: "unit", label: "Unit / UOM" },
  { key: "pack_size", label: "Pack Size" },
  { key: "currentStock", label: "Current Stock", numeric: true },
  { key: "parLevel", label: "PAR Level", numeric: true },
  { key: "leadTimeDays", label: "Lead Time (Days)", numeric: true },
  { key: "unitCost", label: "Unit Cost", numeric: true },
  { key: "vendor_name", label: "Vendor Name" },
];

export type VendorPreset = {
  id: string;
  label: string;
  detectHeaders: string[];
  mappings: Partial<Record<CanonicalField, string[]>>;
  defaultVendorName?: string;
};

export const VENDOR_PRESETS: VendorPreset[] = [
  {
    id: "sysco",
    label: "Sysco",
    detectHeaders: ["sysco", "sysco item", "sysco brand", "supc", "sysco sku"],
    defaultVendorName: "Sysco",
    mappings: {
      item_name: ["item description", "description", "product description", "item"],
      vendor_sku: ["sysco item", "item number", "item #", "supc", "sku"],
      unitCost: ["price", "unit price", "net price", "last price", "cost"],
      unit: ["uom", "unit", "measure"],
      pack_size: ["pack", "pack size", "pack/size"],
      category: ["category", "product category", "dept"],
    },
  },
  {
    id: "usfoods",
    label: "US Foods",
    detectHeaders: ["us foods", "stock id"],
    defaultVendorName: "US Foods",
    mappings: {
      item_name: ["product description", "item description", "item"],
      vendor_sku: ["item #", "item number", "stock id", "sku"],
      unitCost: ["last cost", "price", "unit cost"],
      unit: ["uom", "unit"],
      pack_size: ["pack", "pack size"],
      category: ["category", "dept"],
    },
  },
  {
    id: "performance",
    label: "Performance Foodservice",
    detectHeaders: ["performance", "pfg"],
    defaultVendorName: "Performance Foodservice",
    mappings: {
      item_name: ["item description", "description", "product"],
      vendor_sku: ["item number", "item #", "sku"],
      unitCost: ["cost", "net cost", "unit price"],
      unit: ["uom", "unit"],
      pack_size: ["pack size", "pack"],
      category: ["category", "dept"],
    },
  },
  {
    id: "r365",
    label: "Restaurant365",
    detectHeaders: ["r365", "restaurant365", "on hand"],
    defaultVendorName: "Restaurant365",
    mappings: {
      item_name: ["item name", "name", "product name"],
      vendor_sku: ["item code", "item number", "sku"],
      unitCost: ["last cost", "average cost", "current cost"],
      unit: ["uom", "unit of measure"],
      currentStock: ["on hand", "onhand", "quantity on hand"],
      category: ["category", "storage location", "department"],
      vendor_name: ["vendor", "primary vendor"],
      pack_size: ["pack size", "pack"],
    },
  },
  {
    id: "generic",
    label: "Generic CSV/XLSX",
    detectHeaders: [],
    mappings: {},
  },
];

// Synonym lists for fuzzy matching
const FIELD_SYNONYMS: Record<CanonicalField, string[]> = {
  item_name: ["item", "itemname", "name", "product", "description", "itemdescription", "productdescription", "productname"],
  vendor_sku: ["sku", "item#", "itemnumber", "stockid", "supc", "productcode", "itemcode", "vendorsku"],
  unitCost: ["cost", "unitcost", "price", "unitprice", "lastcost", "avgcost", "netprice", "averagecost", "currentcost"],
  currentStock: ["onhand", "qtyonhand", "quantityonhand", "currentstock", "qty", "count", "stock"],
  unit: ["uom", "unit", "measure", "unitofmeasure"],
  parLevel: ["par", "parlevel", "target", "desired", "reorderpoint"],
  leadTimeDays: ["leadtime", "leaddays", "leadtimedays"],
  category: ["category", "dept", "department", "group", "storagelocation"],
  pack_size: ["pack", "packsize", "pack/size", "casesize"],
  vendor_name: ["vendor", "vendorname", "supplier", "primaryvendor"],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function detectVendor(headers: string[]): VendorPreset {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const joinedHeaders = lowerHeaders.join(" ");

  for (const preset of VENDOR_PRESETS) {
    if (preset.id === "generic") continue;
    for (const detect of preset.detectHeaders) {
      if (joinedHeaders.includes(detect.toLowerCase())) {
        return preset;
      }
    }
  }
  return VENDOR_PRESETS.find(p => p.id === "generic")!;
}

export function autoMapColumns(
  headers: string[],
  preset: VendorPreset
): Record<CanonicalField, string | null> {
  const result: Record<string, string | null> = {};

  for (const field of CANONICAL_FIELDS) {
    result[field.key] = null;
  }

  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalize(h) }));

  for (const field of CANONICAL_FIELDS) {
    // 1. Check preset mappings first
    const presetSynonyms = preset.mappings[field.key] || [];
    for (const syn of presetSynonyms) {
      const match = normalizedHeaders.find(h => h.normalized === normalize(syn));
      if (match && !Object.values(result).includes(match.original)) {
        result[field.key] = match.original;
        break;
      }
    }

    if (result[field.key]) continue;

    // 2. Check global synonyms
    const globalSynonyms = FIELD_SYNONYMS[field.key] || [];
    for (const syn of globalSynonyms) {
      const normSyn = normalize(syn);
      const match = normalizedHeaders.find(h => h.normalized === normSyn);
      if (match && !Object.values(result).includes(match.original)) {
        result[field.key] = match.original;
        break;
      }
    }

    if (result[field.key]) continue;

    // 3. Partial contains match
    for (const syn of [...presetSynonyms, ...globalSynonyms]) {
      const normSyn = normalize(syn);
      const match = normalizedHeaders.find(
        h => h.normalized.includes(normSyn) && !Object.values(result).includes(h.original)
      );
      if (match) {
        result[field.key] = match.original;
        break;
      }
    }
  }

  return result as Record<CanonicalField, string | null>;
}

export function validateNumericField(value: any): { valid: boolean; parsed: number | null } {
  if (value === null || value === undefined || value === "") return { valid: true, parsed: null };
  const num = Number(value);
  if (isNaN(num)) return { valid: false, parsed: null };
  return { valid: true, parsed: num };
}
