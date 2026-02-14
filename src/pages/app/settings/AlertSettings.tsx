import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AlertSettingsPage() {
  const { currentRestaurant } = useRestaurant();
  const { user } = useAuth();
  const [form, setForm] = useState({
    channel_in_app: true,
    channel_email: true,
    email_digest_mode: "IMMEDIATE" as "IMMEDIATE" | "DAILY_DIGEST",
    digest_hour: 8,
    timezone: "America/New_York",
    low_stock_red: true,
    low_stock_yellow: false,
  });
  const [saving, setSaving] = useState(false);
  const [prefId, setPrefId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRestaurant || !user) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefId(data.id);
          setForm({
            channel_in_app: data.channel_in_app,
            channel_email: data.channel_email,
            email_digest_mode: data.email_digest_mode,
            digest_hour: data.digest_hour,
            timezone: data.timezone,
            low_stock_red: data.low_stock_red,
            low_stock_yellow: data.low_stock_yellow,
          });
        }
      });
  }, [currentRestaurant, user]);

  const handleSave = async () => {
    if (!currentRestaurant || !user) return;
    setSaving(true);
    const payload = { ...form, restaurant_id: currentRestaurant.id, user_id: user.id, updated_at: new Date().toISOString() };
    if (prefId) {
      await supabase.from("notification_preferences").update(payload).eq("id", prefId);
    } else {
      const { data } = await supabase.from("notification_preferences").insert(payload).select("id").single();
      if (data) setPrefId(data.id);
    }
    setSaving(false);
    toast.success("Alert preferences saved");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alert Settings</h1>
          <p className="page-description">Configure low stock alerts for {currentRestaurant?.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock Alert Thresholds</CardTitle>
          <CardDescription>Choose which alert levels to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label className="text-xs font-semibold text-destructive">Critical (RED) alerts</Label><p className="text-[11px] text-muted-foreground">Items below 50% of PAR level</p></div>
            <Switch checked={form.low_stock_red} onCheckedChange={v => setForm(p => ({ ...p, low_stock_red: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label className="text-xs font-semibold text-warning">Low (YELLOW) alerts</Label><p className="text-[11px] text-muted-foreground">Items below 100% of PAR level</p></div>
            <Switch checked={form.low_stock_yellow} onCheckedChange={v => setForm(p => ({ ...p, low_stock_yellow: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Preferences</CardTitle>
          <CardDescription>How you want to receive alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label className="text-xs font-semibold">In-app notifications</Label></div>
            <Switch checked={form.channel_in_app} onCheckedChange={v => setForm(p => ({ ...p, channel_in_app: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label className="text-xs font-semibold">Email notifications</Label></div>
            <Switch checked={form.channel_email} onCheckedChange={v => setForm(p => ({ ...p, channel_email: v }))} />
          </div>
          {form.channel_email && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Email mode</Label>
                <Select value={form.email_digest_mode} onValueChange={(v: "IMMEDIATE" | "DAILY_DIGEST") => setForm(p => ({ ...p, email_digest_mode: v }))}>
                  <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                    <SelectItem value="DAILY_DIGEST">Daily Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.email_digest_mode === "DAILY_DIGEST" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Digest hour (0-23)</Label>
                    <Input type="number" min={0} max={23} value={form.digest_hour} onChange={e => setForm(p => ({ ...p, digest_hour: Number(e.target.value) }))} className="h-9 w-24" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Timezone</Label>
                    <Select value={form.timezone} onValueChange={v => setForm(p => ({ ...p, timezone: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern</SelectItem>
                        <SelectItem value="America/Chicago">Central</SelectItem>
                        <SelectItem value="America/Denver">Mountain</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-amber shadow-amber">{saving ? "Saving…" : "Save Preferences"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
