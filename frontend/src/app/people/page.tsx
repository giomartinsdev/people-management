"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  personApi, tenantApi, areaApi, subareaApi,
  type Person, type Tenant, type Area, type Subarea, type PersonOrgPath,
} from "@/lib/api";
import { Plus, Pencil, Trash2, Search, Users, GitBranch, MapPin, Mail } from "lucide-react";

// ── Assign dialog ───────────────────────────────────────────────────────────────

function AssignDialog({
  person,
  open,
  onClose,
  onDone,
}: {
  person: Person;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [subareas, setSubareas] = useState<Subarea[]>([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedSubarea, setSelectedSubarea] = useState("");
  const [mode, setMode] = useState<"subarea" | "area">("subarea");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) tenantApi.list().then(setTenants).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (selectedTenant) areaApi.list(selectedTenant).then(setAreas).catch(() => {});
    else setAreas([]);
    setSelectedArea(""); setSelectedSubarea("");
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedArea) subareaApi.list(selectedArea).then(setSubareas).catch(() => {});
    else setSubareas([]);
    setSelectedSubarea("");
  }, [selectedArea]);

  async function handleAssign() {
    if (mode === "subarea" && !selectedSubarea) { toast.error("Selecione uma subárea"); return; }
    if (mode === "area" && !selectedArea) { toast.error("Selecione uma área"); return; }
    setSaving(true);
    try {
      if (mode === "subarea") {
        await personApi.assignToSubarea(person.id, selectedSubarea);
        toast.success("Pessoa alocada na subárea");
      } else {
        await personApi.assignToArea(person.id, selectedArea);
        toast.success("Pessoa alocada na área");
      }
      onDone();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alocar {person.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "subarea" ? "default" : "outline"} onClick={() => setMode("subarea")}>Subárea</Button>
            <Button size="sm" variant={mode === "area" ? "default" : "outline"} onClick={() => setMode("area")}>Área direta</Button>
          </div>
          <div className="space-y-1">
            <Label>Empresa</Label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}>
              <option value="">Selecione...</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {selectedTenant && (
            <div className="space-y-1">
              <Label>Área</Label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
                <option value="">Selecione...</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          {mode === "subarea" && selectedArea && (
            <div className="space-y-1">
              <Label>Subárea</Label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={selectedSubarea} onChange={(e) => setSelectedSubarea(e.target.value)}>
                <option value="">Selecione...</option>
                {subareas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={saving}>{saving ? "Alocando..." : "Alocar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Org path sheet ──────────────────────────────────────────────────────────────

function OrgPathSheet({ personId, open, onClose }: { personId: string; open: boolean; onClose: () => void }) {
  const [path, setPath] = useState<PersonOrgPath | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && personId) {
      setLoading(true);
      personApi.orgPath(personId).then(setPath).catch(() => toast.error("Erro")).finally(() => setLoading(false));
    }
  }, [open, personId]);

  const nodes = [
    { label: "Empresa", key: "tenant" as const, color: "border-blue-400 bg-blue-50" },
    { label: "Área", key: "area" as const, color: "border-green-400 bg-green-50" },
    { label: "Subárea", key: "subarea" as const, color: "border-orange-400 bg-orange-50" },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Caminho Organizacional</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {loading && <Skeleton className="h-24 w-full" />}
          {!loading && path && nodes.map(({ label, key, color }) => {
            const node = path[key] as Record<string, unknown> | null;
            if (!node) return (
              <div key={key} className={`rounded-lg border-l-4 border-gray-200 bg-gray-50 px-4 py-3 opacity-40`}>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-sm text-muted-foreground italic">Não atribuído</div>
              </div>
            );
            return (
              <div key={key} className={`rounded-lg border-l-4 ${color} px-4 py-3`}>
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold">{String(node.name ?? "")}</div>
                {node.email != null && <div className="text-xs text-muted-foreground">{String(node.email)}</div>}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Person form ─────────────────────────────────────────────────────────────────

type PersonForm = {
  name: string; document: string; email: string;
  street: string; number: string; neighborhood: string; city: string; state: string; zip_code: string;
};

const emptyForm: PersonForm = {
  name: "", document: "", email: "",
  street: "", number: "", neighborhood: "", city: "", state: "", zip_code: "",
};

function formToPayload(f: PersonForm) {
  const hasAddr = f.street || f.city;
  return {
    name: f.name,
    document: f.document,
    email: f.email,
    addresses: hasAddr
      ? [{ street: f.street, number: f.number, neighborhood: f.neighborhood, city: f.city, state: f.state, zip_code: f.zip_code, country: "BR" }]
      : [],
  };
}

function personToForm(p: Person): PersonForm {
  const a = p.addresses[0];
  return { name: p.name, document: p.document, email: p.email, street: a?.street ?? "", number: a?.number ?? "", neighborhood: a?.neighborhood ?? "", city: a?.city ?? "", state: a?.state ?? "", zip_code: a?.zip_code ?? "" };
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [dialog, setDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Person | null>(null);
  const [form, setForm] = useState<PersonForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [assignTarget, setAssignTarget] = useState<Person | null>(null);
  const [orgPathTarget, setOrgPathTarget] = useState<string>("");

  const load = useCallback(async (name?: string) => {
    setLoading(true);
    try { setPeople(await personApi.list(0, 100, name)); }
    catch { toast.error("Erro ao carregar pessoas"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(value || undefined), 400);
  }

  async function handleSave() {
    if (!form.name || !form.document || !form.email) { toast.error("Nome, documento e e-mail são obrigatórios"); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await personApi.update(editTarget.id, formToPayload(form) as Parameters<typeof personApi.update>[1]);
        toast.success("Pessoa atualizada");
      } else {
        await personApi.create(formToPayload(form) as Parameters<typeof personApi.create>[0]);
        toast.success("Pessoa criada");
      }
      setDialog(false);
      load(search || undefined);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await personApi.delete(deleteTarget.id);
      toast.success("Pessoa removida");
      setDeleteTarget(null);
      load(search || undefined);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setDeleting(false); }
  }

  const set = (k: keyof PersonForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pessoas</h2>
          <p className="text-muted-foreground">Cadastro e alocação de colaboradores</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setForm(emptyForm); setDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />Nova Pessoa
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome..." value={search} onChange={(e) => handleSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : people.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{search ? "Nenhum resultado" : "Nenhuma pessoa cadastrada"}</p>
          {!search && (
            <Button className="mt-4" onClick={() => { setEditTarget(null); setForm(emptyForm); setDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />Cadastrar primeira pessoa
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                  <TableHead className="w-44">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.document}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />{p.email}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {p.addresses[0] ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{p.addresses[0].city}/{p.addresses[0].state}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Caminho org." onClick={() => setOrgPathTarget(p.id)}>
                          <GitBranch className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Alocar" onClick={() => setAssignTarget(p)}>
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => { setEditTarget(p); setForm(personToForm(p)); setDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Remover" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">{people.length} pessoa(s)</div>
        </Card>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialog} onOpenChange={(o) => !o && setDialog(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome completo *</Label>
                <Input value={form.name} onChange={set("name")} placeholder="João da Silva" />
              </div>
              <div className="space-y-1">
                <Label>CPF/RG *</Label>
                <Input value={form.document} onChange={set("document")} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="joao@empresa.com" />
            </div>
            <Separator />
            <div className="text-sm font-medium text-muted-foreground">Endereço (opcional)</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Rua</Label>
                <Input value={form.street} onChange={set("street")} />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input value={form.number} onChange={set("number")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input value={form.neighborhood} onChange={set("neighborhood")} />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={set("city")} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Input value={form.state} onChange={set("state")} maxLength={2} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <Input value={form.zip_code} onChange={set("zip_code")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editTarget ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      {assignTarget && (
        <AssignDialog
          person={assignTarget}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          onDone={() => { setAssignTarget(null); }}
        />
      )}

      {/* Org path sheet */}
      <OrgPathSheet personId={orgPathTarget} open={!!orgPathTarget} onClose={() => setOrgPathTarget("")} />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Remover "${deleteTarget?.name}"?`}
        description="A pessoa será desativada do sistema."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
