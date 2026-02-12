import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Users, Trash2 } from "lucide-react";

export default function StaffPage() {
  const { currentRestaurant } = useRestaurant();
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("STAFF");

  const fetchMembers = async () => {
    if (!currentRestaurant) return;
    const { data } = await supabase
      .from("restaurant_members")
      .select("*, profiles(email, full_name)")
      .eq("restaurant_id", currentRestaurant.id);
    if (data) setMembers(data);
  };

  useEffect(() => { fetchMembers(); }, [currentRestaurant]);

  const handleInvite = async () => {
    toast.info("In production, this would send an invite email. For now, the user must sign up first, then be added by user ID.");
    setOpen(false);
  };

  const handleRemove = async (memberId: string) => {
    const { error } = await supabase.from("restaurant_members").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else { toast.success("Member removed"); fetchMembers(); }
  };

  const handleRoleChange = async (memberId: string, newRole: "OWNER" | "MANAGER" | "STAFF") => {
    const { error } = await supabase.from("restaurant_members").update({ role: newRole }).eq("id", memberId);
    if (error) toast.error(error.message);
    else fetchMembers();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-amber gap-2" size="sm"><Plus className="h-4 w-4" /> Invite</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Staff</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@example.com" /></div>
              <div className="space-y-2"><Label>Role</Label>
                <Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="STAFF">Staff</SelectItem><SelectItem value="MANAGER">Manager</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={handleInvite} className="w-full bg-gradient-amber">Send Invite</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {members.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="mx-auto h-10 w-10 mb-3 opacity-30" />No staff members.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.profiles?.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.profiles?.email}</TableCell>
                  <TableCell>
                    <Select value={m.role} onValueChange={(v: "OWNER" | "MANAGER" | "STAFF") => handleRoleChange(m.id, v)}>
                      <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {m.role !== "OWNER" && (
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
