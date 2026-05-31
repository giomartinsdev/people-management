export type Address = {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

export type Location = {
  latitude: number;
  longitude: number;
};

export type Tenant = {
  id: string;
  name: string;
  document: string;
  email: string;
  addresses: Address[];
  location: Location | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Area = {
  id: string;
  name: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Subarea = {
  id: string;
  name: string;
  area_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Person = {
  id: string;
  name: string;
  document: string;
  email: string;
  addresses: Address[];
  location: Location | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type OrgChartNode = {
  id: string;
  label: string;
  name: string;
  parent_id: string | null;
};

export type OrgChart = { nodes: OrgChartNode[] };

export type PersonOrgPath = {
  tenant: Record<string, unknown> | null;
  area: Record<string, unknown> | null;
  subarea: Record<string, unknown> | null;
  person: Record<string, unknown> | null;
};

const BASE = "/api/v1";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 204) return undefined as unknown as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Tenants ────────────────────────────────────────────────────────────────────

export const tenantApi = {
  list: (skip = 0, limit = 100) =>
    req<Tenant[]>(`/tenants?skip=${skip}&limit=${limit}`),
  get: (id: string) => req<Tenant>(`/tenants/${id}`),
  create: (data: Omit<Tenant, "id" | "created_at" | "updated_at" | "deleted_at">) =>
    req<Tenant>("/tenants", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Tenant, "id" | "created_at" | "updated_at" | "deleted_at">>) =>
    req<Tenant>(`/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/tenants/${id}`, { method: "DELETE" }),
  orgChart: (id: string) => req<OrgChart>(`/tenants/${id}/org-chart`),
};

// ── Areas ──────────────────────────────────────────────────────────────────────

export const areaApi = {
  list: (tenantId: string, skip = 0, limit = 100) =>
    req<Area[]>(`/tenants/${tenantId}/areas?skip=${skip}&limit=${limit}`),
  get: (id: string) => req<Area>(`/areas/${id}`),
  create: (tenantId: string, data: { name: string }) =>
    req<Area>(`/tenants/${tenantId}/areas`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name: string }) =>
    req<Area>(`/areas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/areas/${id}`, { method: "DELETE" }),
  listPeople: (id: string, skip = 0, limit = 100) =>
    req<Person[]>(`/areas/${id}/people?skip=${skip}&limit=${limit}`),
};

// ── Subareas ───────────────────────────────────────────────────────────────────

export const subareaApi = {
  list: (areaId: string, skip = 0, limit = 100) =>
    req<Subarea[]>(`/areas/${areaId}/subareas?skip=${skip}&limit=${limit}`),
  get: (id: string) => req<Subarea>(`/subareas/${id}`),
  create: (areaId: string, data: { name: string }) =>
    req<Subarea>(`/areas/${areaId}/subareas`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name: string }) =>
    req<Subarea>(`/subareas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/subareas/${id}`, { method: "DELETE" }),
  listPeople: (id: string, skip = 0, limit = 100) =>
    req<Person[]>(`/subareas/${id}/people?skip=${skip}&limit=${limit}`),
};

// ── People ─────────────────────────────────────────────────────────────────────

export const personApi = {
  list: (skip = 0, limit = 100, name?: string) => {
    const q = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (name) q.set("name", name);
    return req<Person[]>(`/people?${q}`);
  },
  get: (id: string) => req<Person>(`/people/${id}`),
  create: (data: Omit<Person, "id" | "created_at" | "updated_at" | "deleted_at">) =>
    req<Person>("/people", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Person, "id" | "created_at" | "updated_at" | "deleted_at">>) =>
    req<Person>(`/people/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/people/${id}`, { method: "DELETE" }),
  assignToSubarea: (personId: string, subareaId: string) =>
    req<unknown>(`/people/${personId}/assign-subarea`, {
      method: "POST",
      body: JSON.stringify({ subarea_id: subareaId }),
    }),
  assignToArea: (personId: string, areaId: string) =>
    req<unknown>(`/people/${personId}/assign-area`, {
      method: "POST",
      body: JSON.stringify({ area_id: areaId }),
    }),
  orgPath: (id: string) => req<PersonOrgPath>(`/people/${id}/org-path`),
};
