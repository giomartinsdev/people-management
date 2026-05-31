"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadGraphData, type GraphData, type GraphNode, type GraphLink, type NodeType } from "@/lib/graph-data";
import {
  Building2, Layers, GitBranch, Users, Search, RefreshCw,
  X, ChevronDown, ChevronUp, Info, ZoomIn, ZoomOut,
} from "lucide-react";

// ── Dynamic import of ForceGraph2D (no SSR — canvas only works in browser) ────

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-muted-foreground">Carregando visualização...</div> }
);

// ── Constants ──────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, string> = {
  tenant:  "#3b82f6",   // blue
  area:    "#22c55e",   // green
  subarea: "#f97316",   // orange
  person:  "#a855f7",   // purple
};

const NODE_SIZES: Record<NodeType, number> = {
  tenant: 14,
  area: 10,
  subarea: 8,
  person: 6,
};

const LINK_COLORS: Record<string, string> = {
  HAS_AREA:    "#93c5fd",
  HAS_SUBAREA: "#86efac",
  HAS_MEMBER:  "#d8b4fe",
};

const TYPE_LABELS: Record<NodeType, string> = {
  tenant: "Empresa",
  area: "Área",
  subarea: "Subárea",
  person: "Pessoa",
};

// ── Detail panel ───────────────────────────────────────────────────────────────

function DetailPanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const color = NODE_COLORS[node.type];
  const entity = node.entity as Record<string, unknown>;

  const fields: [string, unknown][] = Object.entries(entity).filter(
    ([k]) => !["id", "created_at", "updated_at", "deleted_at", "tenant_id", "area_id"].includes(k)
  );

  return (
    <Card className="absolute right-4 top-4 z-20 w-72 shadow-xl">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <Badge variant="outline" className="text-xs">{TYPE_LABELS[node.type]}</Badge>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardTitle className="mt-1 text-base">{node.name}</CardTitle>
        {node.detail && <p className="text-xs text-muted-foreground">{node.detail}</p>}
      </CardHeader>
      <Separator />
      <CardContent className="pt-3 pb-4">
        <div className="grid gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">ID</span>
            <p className="font-mono text-[10px] break-all mt-0.5">{node.id}</p>
          </div>
          {fields.map(([key, val]) => {
            if (val == null || (Array.isArray(val) && val.length === 0)) return null;
            if (Array.isArray(val)) {
              return (
                <div key={key}>
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <p className="mt-0.5 text-[10px] font-mono">{JSON.stringify(val[0], null, 2).slice(0, 120)}…</p>
                </div>
              );
            }
            if (typeof val === "object") return null;
            return (
              <div key={key}>
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                <p className="mt-0.5">{String(val)}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Filter sidebar ─────────────────────────────────────────────────────────────

interface Filters {
  showTypes: Set<NodeType>;
  tenantIds: Set<string>;
  areaIds: Set<string>;
  personSearch: string;
  highlightOnly: string | null;   // node id to highlight neighbourhood
}

function FilterSidebar({
  data,
  filters,
  setFilters,
  onReset,
  loading,
  onRefresh,
}: {
  data: GraphData | null;
  filters: Filters;
  setFilters: (f: Filters) => void;
  onReset: () => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState({ types: true, tenants: true, areas: false });

  function toggleType(t: NodeType) {
    const next = new Set(filters.showTypes);
    next.has(t) ? next.delete(t) : next.add(t);
    setFilters({ ...filters, showTypes: next });
  }

  function toggleTenant(id: string) {
    const next = new Set(filters.tenantIds);
    next.has(id) ? next.delete(id) : next.add(id);
    // also reset areas when tenant changes
    setFilters({ ...filters, tenantIds: next, areaIds: new Set() });
  }

  function toggleArea(id: string) {
    const next = new Set(filters.areaIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setFilters({ ...filters, areaIds: next });
  }

  const visibleAreas = data?.areas.filter(
    (a) => filters.tenantIds.size === 0 || filters.tenantIds.has(a.tenant_id)
  ) ?? [];

  return (
    <div className="flex w-64 shrink-0 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold text-sm">Filtros</span>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRefresh} title="Recarregar dados">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onReset} title="Limpar filtros">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0 p-3">

          {/* Person search */}
          <div className="space-y-1.5 pb-3">
            <Label className="text-xs text-muted-foreground">Buscar pessoa</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-7 pl-8 text-xs"
                placeholder="Nome..."
                value={filters.personSearch}
                onChange={(e) => setFilters({ ...filters, personSearch: e.target.value })}
              />
            </div>
          </div>

          <Separator className="mb-3" />

          {/* Show types */}
          <div className="pb-3">
            <button
              className="mb-2 flex w-full items-center justify-between text-xs font-medium"
              onClick={() => setExpanded((e) => ({ ...e, types: !e.types }))}
            >
              Tipos de nó
              {expanded.types ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded.types && (
              <div className="space-y-1">
                {(["tenant", "area", "subarea", "person"] as NodeType[]).map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted text-sm">
                    <input
                      type="checkbox"
                      checked={filters.showTypes.has(t)}
                      onChange={() => toggleType(t)}
                      className="accent-current"
                    />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[t] }} />
                    {TYPE_LABELS[t]}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t === "tenant" && (data?.tenants.length ?? 0)}
                      {t === "area" && (data?.areas.length ?? 0)}
                      {t === "subarea" && (data?.subareas.length ?? 0)}
                      {t === "person" && (data?.people.length ?? 0)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Separator className="mb-3" />

          {/* Tenant filter */}
          <div className="pb-3">
            <button
              className="mb-2 flex w-full items-center justify-between text-xs font-medium"
              onClick={() => setExpanded((e) => ({ ...e, tenants: !e.tenants }))}
            >
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Empresas</span>
              {expanded.tenants ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded.tenants && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {loading ? <Skeleton className="h-20 w-full" /> : data?.tenants.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted text-xs">
                    <input
                      type="checkbox"
                      checked={filters.tenantIds.has(t.id)}
                      onChange={() => toggleTenant(t.id)}
                      className="accent-blue-500"
                    />
                    <span className="truncate flex-1">{t.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Separator className="mb-3" />

          {/* Area filter */}
          <div className="pb-3">
            <button
              className="mb-2 flex w-full items-center justify-between text-xs font-medium"
              onClick={() => setExpanded((e) => ({ ...e, areas: !e.areas }))}
            >
              <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />Áreas {filters.tenantIds.size > 0 && `(${visibleAreas.length})`}</span>
              {expanded.areas ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded.areas && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {loading ? <Skeleton className="h-20 w-full" /> : visibleAreas.length === 0
                  ? <p className="px-2 text-xs text-muted-foreground">Filtre por empresa primeiro</p>
                  : visibleAreas.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted text-xs">
                      <input
                        type="checkbox"
                        checked={filters.areaIds.has(a.id)}
                        onChange={() => toggleArea(a.id)}
                        className="accent-green-500"
                      />
                      <span className="truncate flex-1">{a.name}</span>
                    </label>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="border-t p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Legenda</p>
        {(["tenant", "area", "subarea", "person"] as NodeType[]).map((t) => (
          <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[t] }} />
            {TYPE_LABELS[t]}
          </div>
        ))}
        <div className="mt-2 space-y-1">
          {Object.entries(LINK_COLORS).map(([rel, col]) => (
            <div key={rel} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-0.5 w-4 shrink-0 rounded" style={{ backgroundColor: col }} />
              {rel.replace("_", " ").toLowerCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────

function StatsBar({ visible, total }: { visible: { nodes: number; links: number }; total: { nodes: number; links: number } }) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border bg-card/90 px-4 py-1.5 text-xs shadow-md backdrop-blur-sm">
        <span className="text-muted-foreground">Mostrando</span>
        <span className="font-bold">{visible.nodes}</span>
        <span className="text-muted-foreground">de {total.nodes} nós</span>
        <Separator orientation="vertical" className="h-3" />
        <span className="font-bold">{visible.links}</span>
        <span className="text-muted-foreground">de {total.links} relações</span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const defaultFilters: Filters = {
  showTypes: new Set(["tenant", "area", "subarea", "person"] as NodeType[]),
  tenantIds: new Set(),
  areaIds: new Set(),
  personSearch: "",
  highlightOnly: null,
};

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const graphRef = useRef<ForceGraphMethods>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    setSelectedNode(null);
    try {
      const d = await loadGraphData();
      setData(d);
    } catch (e) {
      toast.error("Erro ao carregar dados do grafo");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto fit graph when data loads
  useEffect(() => {
    if (!loading && data && graphRef.current) {
      setTimeout(() => graphRef.current?.zoomToFit(600), 300);
    }
  }, [loading, data]);

  // ── Filtered graph data ──────────────────────────────────────────────────────

  const { visibleNodes, visibleLinks } = useMemo(() => {
    if (!data) return { visibleNodes: [], visibleLinks: [] };

    const searchLower = filters.personSearch.toLowerCase();

    const visibleNodes = data.nodes.filter((n) => {
      // type filter
      if (!filters.showTypes.has(n.type)) return false;

      // tenant filter: show only nodes under selected tenants
      if (filters.tenantIds.size > 0) {
        if (n.type === "tenant") return filters.tenantIds.has(n.id);
        if (n.type === "area") return filters.tenantIds.has((n.entity as { tenant_id: string }).tenant_id);
        if (n.type === "subarea") {
          const area = data.areas.find((a) => a.id === (n.entity as { area_id: string }).area_id);
          return area ? filters.tenantIds.has(area.tenant_id) : false;
        }
        if (n.type === "person") {
          // person visible if linked to a visible subarea/area
          const linkedAreaId = data.links.some((l) => {
            const src = typeof l.source === "string" ? l.source : l.source.id;
            const tgt = typeof l.target === "string" ? l.target : l.target.id;
            if (tgt !== n.id) return false;
            const srcNode = data.nodes.find((x) => x.id === src);
            if (!srcNode) return false;
            if (srcNode.type === "area") return filters.tenantIds.has((srcNode.entity as { tenant_id: string }).tenant_id);
            if (srcNode.type === "subarea") {
              const area = data.areas.find((a) => a.id === (srcNode.entity as { area_id: string }).area_id);
              return area ? filters.tenantIds.has(area.tenant_id) : false;
            }
            return false;
          });
          return linkedAreaId;
        }
      }

      // area filter
      if (filters.areaIds.size > 0) {
        if (n.type === "area") return filters.areaIds.has(n.id);
        if (n.type === "subarea") return filters.areaIds.has((n.entity as { area_id: string }).area_id);
        if (n.type === "person") {
          return data.links.some((l) => {
            const src = typeof l.source === "string" ? l.source : l.source.id;
            const tgt = typeof l.target === "string" ? l.target : l.target.id;
            if (tgt !== n.id) return false;
            const srcNode = data.nodes.find((x) => x.id === src);
            if (!srcNode) return false;
            if (srcNode.type === "area") return filters.areaIds.has(srcNode.id);
            if (srcNode.type === "subarea") return filters.areaIds.has((srcNode.entity as { area_id: string }).area_id);
            return false;
          });
        }
        if (n.type === "tenant") return false;  // hide tenant when area-filtered
      }

      // person search
      if (searchLower && n.type === "person") {
        return n.name.toLowerCase().includes(searchLower) || n.detail.toLowerCase().includes(searchLower);
      }

      return true;
    });

    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    const visibleLinks = data.links.filter((l) => {
      const src = typeof l.source === "string" ? l.source : l.source.id;
      const tgt = typeof l.target === "string" ? l.target : l.target.id;
      return visibleIds.has(src) && visibleIds.has(tgt);
    });

    return { visibleNodes, visibleLinks };
  }, [data, filters]);

  // ── Node hover — highlight neighbours ───────────────────────────────────────

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    if (!node || !data) { setHighlightNodes(new Set()); setHighlightLinks(new Set()); return; }
    const hn = new Set<string>([node.id]);
    const hl = new Set<string>();
    data.links.forEach((l) => {
      const src = typeof l.source === "string" ? l.source : l.source.id;
      const tgt = typeof l.target === "string" ? l.target : l.target.id;
      if (src === node.id || tgt === node.id) {
        hn.add(src); hn.add(tgt);
        hl.add(`${src}-${tgt}`);
      }
    });
    setHighlightNodes(hn);
    setHighlightLinks(hl);
  }, [data]);

  // ── Custom node canvas painter ───────────────────────────────────────────────

  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r = NODE_SIZES[node.type];
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const alpha = isHighlighted ? 1 : 0.15;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
    ctx.fillStyle = NODE_COLORS[node.type];
    ctx.fill();

    // border ring
    ctx.lineWidth = highlightNodes.has(node.id) ? 2.5 : 1;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // label — only show when zoomed in or for top-level nodes
    const fontSize = Math.min(14, Math.max(8, 12 / globalScale));
    const showLabel = globalScale > 0.5 || node.type === "tenant" || node.type === "area";
    if (showLabel) {
      ctx.font = `${node.type === "tenant" ? "bold " : ""}${fontSize}px sans-serif`;
      ctx.fillStyle = isHighlighted ? "#111" : "#666";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(node.name.length > 20 ? node.name.slice(0, 18) + "…" : node.name, node.x ?? 0, (node.y ?? 0) + r + 2);
    }

    ctx.globalAlpha = 1;
  }, [highlightNodes]);

  const paintLink = useCallback((link: GraphLink, ctx: CanvasRenderingContext2D) => {
    const src = typeof link.source === "object" ? link.source : data?.nodes.find((n) => n.id === link.source);
    const tgt = typeof link.target === "object" ? link.target : data?.nodes.find((n) => n.id === link.target);
    if (!src || !tgt) return;
    const srcNode = typeof link.source === "object" ? link.source : src as GraphNode;
    const tgtNode = typeof link.target === "object" ? link.target : tgt as GraphNode;
    const linkId = `${typeof link.source === "string" ? link.source : link.source.id}-${typeof link.target === "string" ? link.target : link.target.id}`;
    const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(linkId);

    ctx.globalAlpha = isHighlighted ? 0.8 : 0.1;
    ctx.beginPath();
    ctx.moveTo(srcNode.x ?? 0, srcNode.y ?? 0);
    ctx.lineTo(tgtNode.x ?? 0, tgtNode.y ?? 0);
    ctx.strokeStyle = LINK_COLORS[link.relation] ?? "#999";
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [data, highlightLinks]);

  const resetFilters = () => {
    setFilters({ ...defaultFilters, showTypes: new Set(["tenant", "area", "subarea", "person"] as NodeType[]) });
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Filter Sidebar */}
      <FilterSidebar
        data={data}
        filters={filters}
        setFilters={setFilters}
        onReset={resetFilters}
        loading={loading}
        onRefresh={loadData}
      />

      {/* Graph canvas area */}
      <div className="relative flex-1 overflow-hidden bg-muted/30">
        {/* Top bar */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border bg-card/90 px-3 py-1.5 text-sm font-semibold shadow backdrop-blur-sm">
            <GitBranch className="h-4 w-4 text-primary" />
            Grafo Organizacional
          </div>
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow backdrop-blur-sm">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Carregando...
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="absolute right-4 top-16 z-10 flex flex-col gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7 bg-card/90 backdrop-blur-sm shadow"
            onClick={() => graphRef.current?.zoomToFit(400)}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7 bg-card/90 backdrop-blur-sm shadow"
            onClick={() => graphRef.current?.zoomToFit(400)}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Tip */}
        {!loading && data && data.nodes.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Info className="h-10 w-10" />
            <p className="text-sm">Nenhum dado encontrado. Crie empresas, áreas e pessoas primeiro.</p>
          </div>
        )}

        {!loading && data && visibleNodes.length === 0 && data.nodes.length > 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Search className="h-10 w-10" />
            <p className="text-sm">Nenhum nó visível com os filtros atuais.</p>
            <Button variant="outline" onClick={resetFilters}><X className="mr-2 h-4 w-4" />Limpar filtros</Button>
          </div>
        )}

        {/* The actual force graph */}
        {!loading && data && visibleNodes.length > 0 && (
          <ForceGraph2D
            ref={graphRef}
            graphData={{ nodes: visibleNodes as object[], links: visibleLinks as object[] }}
            nodeCanvasObject={paintNode as unknown as (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
            linkCanvasObject={paintLink as unknown as (link: object, ctx: CanvasRenderingContext2D) => void}
            nodeCanvasObjectMode={() => "replace"}
            linkCanvasObjectMode={() => "replace"}
            onNodeClick={(node) => setSelectedNode(node as unknown as GraphNode)}
            onNodeHover={(node) => handleNodeHover(node as unknown as GraphNode | null)}
            onBackgroundClick={() => { setSelectedNode(null); setHighlightNodes(new Set()); setHighlightLinks(new Set()); }}
            nodeLabel={(node) => `${TYPE_LABELS[(node as unknown as GraphNode).type]}: ${(node as unknown as GraphNode).name}`}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            warmupTicks={80}
            cooldownTicks={100}
            width={undefined}
            height={undefined}
          />
        )}

        {/* Selected node detail panel */}
        {selectedNode && (
          <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}

        {/* Stats bar */}
        {!loading && data && (
          <StatsBar
            visible={{ nodes: visibleNodes.length, links: visibleLinks.length }}
            total={{ nodes: data.nodes.length, links: data.links.length }}
          />
        )}
      </div>
    </div>
  );
}
