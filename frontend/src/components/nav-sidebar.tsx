"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, GitBranch, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/",        label: "Dashboard", icon: LayoutDashboard },
  { href: "/tenants", label: "Empresas",  icon: Building2 },
  { href: "/people",  label: "Pessoas",   icon: Users },
  { href: "/graph",   label: "Grafo",     icon: GitBranch },
];

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col border-r bg-card px-3 py-4">
      <div className="mb-6 px-3">
        <h1 className="text-lg font-bold tracking-tight">People Graph</h1>
        <p className="text-xs text-muted-foreground">Gestão de Pessoas</p>
      </div>
      <ul className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
