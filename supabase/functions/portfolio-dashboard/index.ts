import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    // Get all restaurants user belongs to
    const { data: memberships } = await supabase
      .from("restaurant_members")
      .select("restaurant_id, role, restaurants(id, name)")
      .eq("user_id", userId);

    if (!memberships?.length) {
      return new Response(JSON.stringify({ restaurants: [], totals: { red: 0, yellow: 0, green: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restaurantIds = memberships.map((m: any) => m.restaurants.id);
    const result: any[] = [];
    let totalRed = 0, totalYellow = 0, totalGreen = 0;

    for (const membership of memberships) {
      const rid = (membership as any).restaurants.id;
      const rname = (membership as any).restaurants.name;

      // Latest approved session
      const { data: sessions } = await supabase
        .from("inventory_sessions")
        .select("id, approved_at")
        .eq("restaurant_id", rid)
        .eq("status", "APPROVED")
        .order("approved_at", { ascending: false })
        .limit(1);

      let red = 0, yellow = 0, green = 0;
      let topItems: any[] = [];

      if (sessions?.length) {
        const { data: items } = await supabase
          .from("inventory_session_items")
          .select("item_name, current_stock, par_level, unit")
          .eq("session_id", sessions[0].id);

        if (items) {
          items.forEach((i: any) => {
            const ratio = i.current_stock / Math.max(i.par_level, 1);
            if (ratio < 0.5) red++;
            else if (ratio < 1) yellow++;
            else green++;
          });
          topItems = items
            .map((i: any) => ({ ...i, suggested: Math.max(i.par_level - i.current_stock, 0), ratio: i.current_stock / Math.max(i.par_level, 1) }))
            .sort((a: any, b: any) => b.suggested - a.suggested)
            .slice(0, 5);
        }
      }

      // Recent orders count
      const { count: orderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", rid);

      // Unread notifications
      const { count: unreadAlerts } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("restaurant_id", rid)
        .is("read_at", null);

      totalRed += red;
      totalYellow += yellow;
      totalGreen += green;

      result.push({
        id: rid,
        name: rname,
        role: membership.role,
        red,
        yellow,
        green,
        topReorder: topItems,
        recentOrders: orderCount || 0,
        unreadAlerts: unreadAlerts || 0,
        lastApproved: sessions?.[0]?.approved_at || null,
      });
    }

    return new Response(JSON.stringify({
      restaurants: result,
      totals: { red: totalRed, yellow: totalYellow, green: totalGreen },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Portfolio dashboard error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
