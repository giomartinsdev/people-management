"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenantApi, personApi } from "@/lib/api";
import { Building2, Users, Network } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [personCount, setPersonCount] = useState<number | null>(null);

  useEffect(() => {
    tenantApi.list().then((d) => setTenantCount(d.length)).catch(() => setTenantCount(0));
    personApi.list().then((d) => setPersonCount(d.length)).catch(() => setPersonCount(0));
  }, []);

  const stats = [
    { label: "Empresas (Tenants)", value: tenantCount, icon: Building2, href: "/tenants", color: "text-blue-600" },
    { label: "Pessoas", value: personCount, icon: Users, href: "/people", color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral do sistema de gestão de pessoas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-5 w-5 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {value === null ? "..." : value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Grafo Hierárquico</CardTitle>
            <Network className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Tenant → Area → Subarea → Pessoa
            </p>
            <p className="text-xs text-muted-foreground">
              Armazenado com Apache AGE no PostgreSQL
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" render={<Link href="/tenants" />} className="justify-start">
              <Building2 className="mr-2 h-4 w-4" />Gerenciar Empresas
            </Button>
            <Button variant="outline" render={<Link href="/people" />} className="justify-start">
              <Users className="mr-2 h-4 w-4" />Gerenciar Pessoas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
