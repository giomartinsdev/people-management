"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { tenantApi, type Tenant } from "@/lib/api";
import { Plus, Pencil, Trash2, ChevronRight, Building2 } from "lucide-react";

type FormData = {
  name: string; document: string; email: string;
  city: string; state: string; street: string; number: string; zip_code: string; neighborhood: string;
};

const emptyForm: FormData = {
  name: "", document: "", email: "",
  city: "", state: "", street: "", number: "", zip_code: "", neighborhood: "",
};

function toPayload(f: FormData) {
  const hasAddress = f.street || f.city || f.neighborhood;
  return {
    name: f.name,
    document: f.document,
    email: f.email,
    addresses: hasAddress
      ? [{ street: f.street, number: f.number, neighborhood: f.neighborhood, city: f.city, state: f.state, zip_code: f.zip_code, country: "BR" }]
      : [],
  };
}

function fromTenant(t: Tenant): FormData {
  const addr = t.addresses[0];
  return {
    name: t.name, document: t.document, email: t.email,
    street: addr?.street ?? "", number: addr?.number ?? "",
    neighborhood: addr?.neighborhood ?? "", city: addr?.city ?? "",
    state: addr?.state ?? "", zip_code: addr?.zip_code ?? "",
  };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTenants(await tenantApi.list()); }
    catch { toast.error("Erro ao carregar empresas"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditTarget(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(t: Tenant) { setEditTarget(t); setForm(fromTenant(t)); setDialogOpen(true); }

  async function handleSave() {
    if (!form.name || !form.document || !form.email) {
      toast.error("Nome, documento e e-mail são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await tenantApi.update(editTarget.id, toPayload(form));
        toast.success("Empresa atualizada");
      } else {
        await tenantApi.create(toPayload(form) as Parameters<typeof tenantApi.create>[0]);
        toast.success("Empresa criada");
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await tenantApi.delete(deleteTarget.id);
      toast.success("Empresa removida");
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    } finally {
      setDeleting(false);
    }
  }

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Empresas</h2>
          <p className="text-muted-foreground">Gerencie os tenants da plataforma</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Empresa</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : tenants.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
          <Button className="mt-4" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Criar primeira empresa</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => (
            <Card key={t.id} className="group flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{t.name}</CardTitle>
                  <Badge variant="secondary" className="shrink-0 text-xs">Ativo</Badge>
                </div>
                <CardDescription className="text-xs">{t.email}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-1 text-sm text-muted-foreground">
                <div>Doc: <span className="font-mono text-xs">{t.document}</span></div>
                {t.addresses[0] && (
                  <div className="text-xs">{t.addresses[0].city} / {t.addresses[0].state}</div>
                )}
              </CardContent>
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(t)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button size="sm" variant="outline" render={<Link href={`/tenants/${t.id}`} />} className="h-7 text-xs">
                  Ver detalhes <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={set("name")} placeholder="Acme Corp" />
              </div>
              <div className="space-y-1">
                <Label>CNPJ/CPF *</Label>
                <Input value={form.document} onChange={set("document")} placeholder="00.000.000/0001-00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="contato@empresa.com" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">Endereço (opcional)</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Rua</Label>
                <Input value={form.street} onChange={set("street")} placeholder="Av. Paulista" />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input value={form.number} onChange={set("number")} placeholder="1000" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input value={form.neighborhood} onChange={set("neighborhood")} />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={set("city")} placeholder="São Paulo" />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Input value={form.state} onChange={set("state")} placeholder="SP" maxLength={2} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <Input value={form.zip_code} onChange={set("zip_code")} placeholder="01310-100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editTarget ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Remover "${deleteTarget?.name}"?`}
        description="A empresa será desativada. Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
