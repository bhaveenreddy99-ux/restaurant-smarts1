import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useLocation, useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Building2, MapPin, Bell, ChevronsUpDown, Check } from "lucide-react";

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
  "/app/notifications": "Notifications",
};

export function AppHeader() {
  const {
    restaurants, currentRestaurant, setCurrentRestaurant,
    isPortfolioMode, locations, currentLocation, setCurrentLocation,
  } = useRestaurant();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const pageName = routeNames[location.pathname] ||
    (location.pathname.startsWith("/app/inventory/import") ? "Import" :
     location.pathname.startsWith("/app/settings") ? "Settings" : "");

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border/60 px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <SidebarTrigger className="-ml-1 h-7 w-7" />
      <Separator orientation="vertical" className="h-4" />
      <span className="text-sm font-medium text-foreground">{pageName}</span>
      <div className="flex-1" />

      {/* Restaurant Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2.5">
            <Building2 className="h-3.5 w-3.5 opacity-60" />
            <span className="truncate max-w-[120px]">
              {isPortfolioMode ? "All Restaurants" : currentRestaurant?.name || "Select"}
            </span>
            <ChevronsUpDown className="h-3 w-3 opacity-40" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setCurrentRestaurant(null)}
            className={isPortfolioMode ? "bg-accent" : ""}
          >
            <span className="font-medium">All Restaurants</span>
            {isPortfolioMode && <Check className="h-3.5 w-3.5 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {restaurants.map((r) => (
            <DropdownMenuItem
              key={r.id}
              onClick={() => setCurrentRestaurant(r)}
              className={r.id === currentRestaurant?.id ? "bg-accent" : ""}
            >
              {r.name}
              <span className="ml-auto text-[10px] text-muted-foreground font-medium">{r.role}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Location Switcher */}
      {!isPortfolioMode && locations.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2.5">
              <MapPin className="h-3.5 w-3.5 opacity-60" />
              <span className="truncate max-w-[100px]">
                {currentLocation?.name || "All Locations"}
              </span>
              <ChevronsUpDown className="h-3 w-3 opacity-40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => setCurrentLocation(null)}
              className={!currentLocation ? "bg-accent" : ""}
            >
              All Locations
              {!currentLocation && <Check className="h-3.5 w-3.5 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {locations.map((l) => (
              <DropdownMenuItem
                key={l.id}
                onClick={() => setCurrentLocation(l)}
                className={l.id === currentLocation?.id ? "bg-accent" : ""}
              >
                {l.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Separator orientation="vertical" className="h-4" />

      {/* Notifications Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 relative"
        onClick={() => navigate("/app/notifications")}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[9px] font-bold bg-destructive text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Profile avatar */}
      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-[10px] font-bold text-primary">
          {currentRestaurant?.name?.charAt(0)?.toUpperCase() || "R"}
        </span>
      </div>
    </header>
  );
}
