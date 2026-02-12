import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ClipboardCheck,
  CheckCircle,
  ShoppingCart,
  BookOpen,
  ListChecks,
  Truck,
  BarChart3,
  Users,
  ChefHat,
  ChevronsUpDown,
  LogOut,
  Receipt,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
];

const inventoryNav = [
  { title: "Inventory Lists", url: "/app/inventory/lists", icon: ClipboardList },
  { title: "Enter Inventory", url: "/app/inventory/enter", icon: Package },
  { title: "Review", url: "/app/inventory/review", icon: ClipboardCheck },
  { title: "Approved", url: "/app/inventory/approved", icon: CheckCircle },
];

const parNav = [
  { title: "PAR Management", url: "/app/par", icon: BookOpen },
];

const orderNav = [
  { title: "Smart Order", url: "/app/smart-order", icon: ShoppingCart },
  { title: "List Management", url: "/app/lists", icon: ListChecks },
  { title: "Purchase History", url: "/app/purchase-history", icon: Receipt },
];

const operationsNav = [
  { title: "Orders", url: "/app/orders", icon: Truck },
  { title: "Reports", url: "/app/reports", icon: BarChart3 },
];

const adminNav = [
  { title: "Staff", url: "/app/staff", icon: Users },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { restaurants, currentRestaurant, setCurrentRestaurant } = useRestaurant();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const isOwner = currentRestaurant?.role === "OWNER";

  const renderGroup = (label: string, items: typeof mainNav) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
              >
                <NavLink
                  to={item.url}
                  end={item.url === "/app/dashboard"}
                  className="gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <ChefHat className="h-6 w-6 text-sidebar-primary" />
          <span className="text-base font-bold text-sidebar-accent-foreground">
            Resta<span className="text-sidebar-primary">rentIQ</span>
          </span>
        </div>

        {/* Restaurant Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between text-sm text-sidebar-foreground hover:bg-sidebar-accent h-9 px-3"
            >
              <span className="truncate">{currentRestaurant?.name || "Select"}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {restaurants.map((r) => (
              <DropdownMenuItem
                key={r.id}
                onClick={() => setCurrentRestaurant(r)}
                className={r.id === currentRestaurant?.id ? "bg-accent" : ""}
              >
                {r.name}
                <span className="ml-auto text-xs text-muted-foreground">{r.role}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SidebarContent className="px-2">
        {renderGroup("Overview", mainNav)}
        {renderGroup("Inventory Management", inventoryNav)}
        {renderGroup("PAR Management", parNav)}
        {renderGroup("Ordering", orderNav)}
        {renderGroup("Operations", operationsNav)}
        {isOwner && renderGroup("Admin", adminNav)}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => { signOut(); navigate("/"); }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
