import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Tables } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/RoleGuard";
import { SiteForm } from "@/components/SiteForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Site = Pick<
  Tables["construction_sites"]["Row"],
  "id" | "name" | "address"
>;

export function SitesPage() {
  const { user } = useSession();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Site | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("construction_sites")
      .select("id, name, address")
      .order("name");
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSites(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(site: Site) {
    setEditing(site);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Objects</h1>
          <p className="text-sm text-muted-foreground">
            {user?.role === "manager"
              ? "All construction sites in the system."
              : "Sites where you have tasks assigned."}
          </p>
        </div>
        <RoleGuard role="manager">
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            New site
          </Button>
        </RoleGuard>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : sites.length === 0 ? (
        <p className="text-muted-foreground">No sites yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">
                    <Link
                      to={`/sites/${site.id}`}
                      className="hover:underline"
                    >
                      {site.name}
                    </Link>
                  </CardTitle>
                  <RoleGuard role="manager">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(site)}
                      aria-label="Edit site"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </RoleGuard>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {site.address}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SiteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={load}
      />
    </div>
  );
}
