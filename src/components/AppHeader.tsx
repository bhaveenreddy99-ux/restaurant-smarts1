import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRestaurant } from "@/contexts/RestaurantContext";

export function AppHeader() {
  const { currentRestaurant } = useRestaurant();

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border px-6">
      <SidebarTrigger className="-ml-2" />
      <div className="flex-1" />
      <span className="text-sm text-muted-foreground">
        {currentRestaurant?.name}
      </span>
    </header>
  );
}
