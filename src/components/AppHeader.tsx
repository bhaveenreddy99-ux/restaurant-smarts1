import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const routeNames: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/inventory/lists": "Inventory Lists",
  "/app/inventory/enter": "Enter Inventory",
  "/app/inventory/review": "Review",
  "/app/inventory/approved": "Approved",
  "/app/smart-order": "Smart Order",
  "/app/purchase-history": "Purchase History",
  "/app/par": "PAR Management",
  "/app/orders": "Orders",
  "/app/reports": "Reports",
  "/app/staff": "Staff",
};

export function AppHeader() {
  const { currentRestaurant } = useRestaurant();
  const location = useLocation();

  const pageName = routeNames[location.pathname] ||
    (location.pathname.startsWith("/app/inventory/import") ? "Import" : "");

  return (
    <header className="flex h-12 items-center gap-3 border-b border-border/60 px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <SidebarTrigger className="-ml-1 h-7 w-7" />
      <Separator orientation="vertical" className="h-4" />
      <span className="text-sm font-medium text-foreground">{pageName}</span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">
            {currentRestaurant?.name?.charAt(0)?.toUpperCase() || "R"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {currentRestaurant?.name}
        </span>
      </div>
    </header>
  );
}