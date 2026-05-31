import { tenantApi, areaApi, subareaApi, personApi } from "./api";
import type { Tenant, Area, Subarea, Person } from "./api";

export type NodeType = "tenant" | "area" | "subarea" | "person";

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  detail: string;
  entity: Tenant | Area | Subarea | Person;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: "HAS_AREA" | "HAS_SUBAREA" | "HAS_MEMBER";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  tenants: Tenant[];
  areas: Area[];
  subareas: Subarea[];
  people: Person[];
}

const PAGE = 200;

async function fetchAll<T>(
  fetcher: (skip: number, limit: number) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];
  let skip = 0;
  while (true) {
    const page = await fetcher(skip, PAGE);
    results.push(...page);
    if (page.length < PAGE) break;
    skip += PAGE;
  }
  return results;
}

export async function loadGraphData(): Promise<GraphData> {
  const tenants = await fetchAll((s, l) => tenantApi.list(s, l));

  const areasByTenant = await Promise.all(
    tenants.map((t) =>
      fetchAll((s, l) => areaApi.list(t.id, s, l)).then((areas) => ({ tenantId: t.id, areas }))
    )
  );

  const allAreas: Area[] = areasByTenant.flatMap((r) => r.areas);

  const subareasByArea = await Promise.all(
    allAreas.map((a) =>
      fetchAll((s, l) => subareaApi.list(a.id, s, l)).then((subs) => ({ areaId: a.id, subs }))
    )
  );

  const allSubareas: Subarea[] = subareasByArea.flatMap((r) => r.subs);

  const [subareaPeople, areaPeople, allPeople] = await Promise.all([
    Promise.all(
      allSubareas.map((sub) =>
        fetchAll((s, l) => subareaApi.listPeople(sub.id, s, l)).then((people) => ({
          subareaId: sub.id,
          people,
        }))
      )
    ),
    Promise.all(
      allAreas.map((a) =>
        fetchAll((s, l) => areaApi.listPeople(a.id, s, l)).then((people) => ({
          areaId: a.id,
          people,
        }))
      )
    ),
    fetchAll((s, l) => personApi.list(s, l)),
  ]);

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenIds = new Set<string>();

  function addNode(n: GraphNode) {
    if (!seenIds.has(n.id)) {
      seenIds.add(n.id);
      nodes.push(n);
    }
  }

  for (const t of tenants) {
    addNode({ id: t.id, name: t.name, type: "tenant", detail: t.email, entity: t });
  }

  for (const { tenantId, areas } of areasByTenant) {
    const tenantName = tenants.find((t) => t.id === tenantId)?.name ?? "";
    for (const a of areas) {
      addNode({ id: a.id, name: a.name, type: "area", detail: tenantName, entity: a });
      links.push({ source: tenantId, target: a.id, relation: "HAS_AREA" });
    }
  }

  for (const { areaId, subs } of subareasByArea) {
    const areaName = allAreas.find((a) => a.id === areaId)?.name ?? "";
    for (const s of subs) {
      addNode({ id: s.id, name: s.name, type: "subarea", detail: areaName, entity: s });
      links.push({ source: areaId, target: s.id, relation: "HAS_SUBAREA" });
    }
  }

  const attachedPeopleIds = new Set<string>();

  for (const { subareaId, people } of subareaPeople) {
    for (const p of people) {
      attachedPeopleIds.add(p.id);
      addNode({ id: p.id, name: p.name, type: "person", detail: p.email, entity: p });
      links.push({ source: subareaId, target: p.id, relation: "HAS_MEMBER" });
    }
  }

  for (const { areaId, people } of areaPeople) {
    for (const p of people) {
      if (!attachedPeopleIds.has(p.id)) {
        attachedPeopleIds.add(p.id);
        addNode({ id: p.id, name: p.name, type: "person", detail: p.email, entity: p });
      }
      const alreadyLinked = links.some((l) => {
        const src = typeof l.source === "string" ? l.source : l.source.id;
        const tgt = typeof l.target === "string" ? l.target : l.target.id;
        return src === areaId && tgt === p.id;
      });
      if (!alreadyLinked) {
        links.push({ source: areaId, target: p.id, relation: "HAS_MEMBER" });
      }
    }
  }

  for (const p of allPeople) {
    if (!attachedPeopleIds.has(p.id)) {
      addNode({ id: p.id, name: p.name, type: "person", detail: p.email, entity: p });
    }
  }

  return { nodes, links, tenants, areas: allAreas, subareas: allSubareas, people: allPeople };
}
