"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { SidebarNav } from "@/components/layout/Sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GlobalSearch } from "@/features/search/components/GlobalSearch";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  propostas: "Propostas",
  contratos: "Contratos",
  agenda: "Agenda",
  configuracoes: "Configurações",
};

export function Topbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const current = LABELS[segment] ?? segment;
  const initial = userEmail.charAt(0).toUpperCase() || "?";

  return (
    <header className="flex h-14 items-center gap-4 border-b px-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden">
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <Logo />
          </div>
          <SidebarNav />
        </SheetContent>
      </Sheet>

      <p className="text-sm font-medium">{current}</p>

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="size-8">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action="/auth/sign-out" method="post" className="w-full">
                <button type="submit" className="w-full text-left">
                  Sair
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
