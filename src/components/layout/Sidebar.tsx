"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/propostas", label: "Propostas", icon: KanbanSquare },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {active ? (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
            ) : null}
            <Icon className={cn("size-4", active && "text-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:block">
      <div className="flex h-14 items-center border-b px-4">
        <Logo />
      </div>
      <SidebarNav />
    </aside>
  );
}
