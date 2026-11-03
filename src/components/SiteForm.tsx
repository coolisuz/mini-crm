import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { id: string; name: string; address: string } | null;
  onSaved: () => void;
};

export function SiteForm({ open, onOpenChange, initial, onSaved }: Props) {
  const { user } = useSession();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setAddress(initial?.address ?? "");
    }
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = { name: name.trim(), address: address.trim() };
    const { error } = initial
      ? await supabase
          .from("construction_sites")
          .update(payload)
          .eq("id", initial.id)
      : await supabase
          .from("construction_sites")
          .insert({ ...payload, created_by: user.id });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial ? "Site updated" : "Site created");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initial ? "Edit site" : "New site"}</DialogTitle>
            <DialogDescription>
              A site is a construction project. Tasks are created on sites.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Name</Label>
              <Input
                id="site-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Downtown Tower"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-address">Address</Label>
              <Input
                id="site-address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Main St"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
