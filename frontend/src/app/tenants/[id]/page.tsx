"use client";

import { useEffect, useState, useCallback, use } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { tenantApi, areaApi, subareaApi, subareaApi as subApi, type Tenant, type Area, type Subarea, type OrgChartNode, personApi, type Person } from "@/lib/api";
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronRight, GitBranch, Users, Layers,
} from "lucide-react";

// ── Org Chart ──────────────────────────────────────────────────────────────────

function OrgTree({ nodes }: { nodes: OrgChartNode[] }) {
  function renderNode(node: OrgChartNode, depth = 0) {
    const children = nodes.filter((n) => n.parent_id === node.id);
    const colors: Record<string, string> = {
      Tenant: "border-blue-400 bg-blue-50",
      Area: "border-green-400 bg-green-50",
      Subarea: "border-orange-400 bg-orange-50",
    };
    return (
      <div key={node.id} style={{ paddingLeft: depth * 24 }}>
        <div className={`mb-2 flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-sm ${colors[node.label] ?? "border-gray-300 bg-gray-50"}`}>
          <Badge variant="outline" className="text-xs">{node.label}</Badge>
          <span className="font-medium">{node.name}</span>
        </div>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }
  const roots = nodes.filter((n) => !n.parent_id);
  return (
    <div className="space-y-1">
      {roots.map((r) => renderNode(r))}
      {nodes.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum nó encontrado</p>
      )}
    </div>
  );
}

// ── Subarea panel inside Area card ─────────────────────────────────────────────

function AreaCard({ area, onEdit, onDelete }: { area: Area; onEdit: (a: Area) => void; onDelete: (a: Area) => void }) {
  const [subareas, setSubareas] = useState<Subarea[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [subDialog, setSubDialog] = useState(false);
  const [subName, setSubName] = useState("");
  const [subSaving, setSubSaving] = useState(false);
  const [subEdit, setSubEdit] = useState<Subarea | null>(null);
  const [subDelete, setSubDelete] = useState<Subarea | null>(null);
  const [subDeleting, setSubDeleting] = useState(false);

  const loadSubs = useCallback(async () => {
    const [s, p] = await Promise.all([
      subareaApi.list(area.id).catch(() => [] as Subarea[]),
      areaApi.listPeople(area.id).catch(() => [] as Person[]),
    ]);
    setSubareas(s);
    setPeople(p);
  }, [area.id]);

  useEffect(() => { if (expanded) loadSubs(); }, [expanded, loadSubs]);

  async function saveSubarea() {
    if (!subName.trim()) { toast.error("Nome obrigatório"); return; }
    setSubSaving(true);
    try {
      if (subEdit) {
        await subApi.update(subEdit.id, { name: subName });
        toast.success("Subárea atualizada");
      } else {
        await subApi.create(area.id, { name: subName });
        toast.success("Subárea criada");
      }
      setSubDialog(false); setSubName(""); setSubEdit(null);
      loadSubs();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setSubSaving(false); }
  }

  async function deleteSubarea() {
    if (!subDelete) return;
    setSubDeleting(true);
    try {
      await subApi.delete(subDelete.id);
      toast.success("Subárea removida");
      setSubDelete(null);
      loadSubs();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setSubDeleting(false); }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{area.name}</CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(area)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(area)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Fechar" : "Expandir"} <ChevronRight className={`ml-1 h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <Separator />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3" /> Subáreas ({subareas.length})
              </span>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setSubEdit(null); setSubName(""); setSubDialog(true); }}>
                <Plus className="mr-1 h-3 w-3" />Nova
              </Button>
            </div>
            {subareas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma subárea</p>
            ) : (
              <div className="space-y-1">
                {subareas.map((s) => (
                  <SubareaRow
                    key={s.id}
                    subarea={s}
                    onEdit={() => { setSubEdit(s); setSubName(s.name); setSubDialog(true); }}
                    onDelete={() => setSubDelete(s)}
                  />
                ))}
              </div>
            )}
          </div>
          {people.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Membros diretos ({people.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {people.map((p) => (
                  <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}

      <Dialog open={subDialog} onOpenChange={(o) => !o && setSubDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subEdit ? "Editar Subárea" : "Nova Subárea"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nome</Label>
            <Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Nome da subárea" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog(false)} disabled={subSaving}>Cancelar</Button>
            <Button onClick={saveSubarea} disabled={subSaving}>{subSaving ? "Salvando..." : subEdit ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!subDelete}
        title={`Remover subárea "${subDelete?.name}"?`}
        onConfirm={deleteSubarea}
        onCancel={() => setSubDelete(null)}
        loading={subDeleting}
      />
    </Card>
  );
}

function SubareaRow({ subarea, onEdit, onDelete }: { subarea: Subarea; onEdit: () => void; onDelete: () => void }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) subareaApi.listPeople(subarea.id).then(setPeople).catch(() => {});
  }, [expanded, subarea.id]);

  return (
    <div className="rounded border px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{subarea.name}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setExpanded((e) => !e)}>
            <Users className="h-3 w-3 mr-1" />{expanded ? "▲" : "▼"}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1">
          {people.length === 0
            ? <span className="text-xs text-muted-foreground">Sem membros</span>
            : people.map((p) => <Badge key={p.id} variant="outline" className="text-xs">{p.name}</Badge>)
          }
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);

  const [areaDialog, setAreaDialog] = useState(false);
  const [areaEdit, setAreaEdit] = useState<Area | null>(null);
  const [areaName, setAreaName] = useState("");
  const [areaSaving, setAreaSaving] = useState(false);
  const [areaDelete, setAreaDelete] = useState<Area | null>(null);
  const [areaDeleting, setAreaDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, a, chart] = await Promise.all([
        tenantApi.get(id),
        areaApi.list(id),
        tenantApi.orgChart(id),
      ]);
      setTenant(t);
      setAreas(a);
      setOrgNodes(chart.nodes);
    } catch {
      toast.error("Erro ao carregar empresa");
      router.push("/tenants");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function saveArea() {
    if (!areaName.trim()) { toast.error("Nome obrigatório"); return; }
    setAreaSaving(true);
    try {
      if (areaEdit) {
        await areaApi.update(areaEdit.id, { name: areaName });
        toast.success("Área atualizada");
      } else {
        await areaApi.create(id, { name: areaName });
        toast.success("Área criada");
      }
      setAreaDialog(false); setAreaName(""); setAreaEdit(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setAreaSaving(false); }
  }

  async function deleteArea() {
    if (!areaDelete) return;
    setAreaDeleting(true);
    try {
      await areaApi.delete(areaDelete.id);
      toast.success("Área removida");
      setAreaDelete(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setAreaDeleting(false); }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/tenants" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />Voltar
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h2 className="text-2xl font-bold">{tenant.name}</h2>
          <p className="text-sm text-muted-foreground">{tenant.email} · {tenant.document}</p>
        </div>
      </div>

      <Tabs defaultValue="areas">
        <TabsList>
          <TabsTrigger value="areas"><Layers className="mr-2 h-4 w-4" />Áreas</TabsTrigger>
          <TabsTrigger value="orgchart"><GitBranch className="mr-2 h-4 w-4" />Organograma</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        {/* Areas tab */}
        <TabsContent value="areas" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{areas.length} área(s)</p>
            <Button onClick={() => { setAreaEdit(null); setAreaName(""); setAreaDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />Nova Área
            </Button>
          </div>
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma área criada</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {areas.map((a) => (
                <AreaCard
                  key={a.id}
                  area={a}
                  onEdit={(area) => { setAreaEdit(area); setAreaName(area.name); setAreaDialog(true); }}
                  onDelete={setAreaDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Org chart tab */}
        <TabsContent value="orgchart" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hierarquia Organizacional</CardTitle>
            </CardHeader>
            <CardContent>
              <OrgTree nodes={orgNodes} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info tab */}
        <TabsContent value="info" className="pt-4">
          <Card>
            <CardContent className="pt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Nome", tenant.name],
                ["Documento", tenant.document],
                ["E-mail", tenant.email],
                ["Criado em", new Date(tenant.created_at).toLocaleDateString("pt-BR")],
                ["Atualizado em", new Date(tenant.updated_at).toLocaleDateString("pt-BR")],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-medium">{value}</div>
                </div>
              ))}
              {tenant.addresses[0] && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Endereço</div>
                  <div className="text-sm">
                    {tenant.addresses[0].street}, {tenant.addresses[0].number} — {tenant.addresses[0].city}/{tenant.addresses[0].state}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Area dialog */}
      <Dialog open={areaDialog} onOpenChange={(o) => !o && setAreaDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{areaEdit ? "Editar Área" : "Nova Área"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nome</Label>
            <Input value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Ex: Engenharia" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialog(false)} disabled={areaSaving}>Cancelar</Button>
            <Button onClick={saveArea} disabled={areaSaving}>{areaSaving ? "Salvando..." : areaEdit ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!areaDelete}
        title={`Remover área "${areaDelete?.name}"?`}
        onConfirm={deleteArea}
        onCancel={() => setAreaDelete(null)}
        loading={areaDeleting}
      />
    </div>
  );
}
