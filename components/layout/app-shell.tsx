"use client";

import {
  Boxes,
  Calculator,
  Factory,
  FileText,
  Flower2,
  Home,
  LogOut,
  PackageCheck,
  PackagePlus,
  Settings,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/materials", label: "Materials", icon: Boxes },
  { href: "/pearl-calculator", label: "Pearl Calculator", icon: Calculator },
  { href: "/suppliers", label: "Suppliers", icon: Store },
  { href: "/purchases", label: "Purchases", icon: PackagePlus },
  { href: "/products", label: "Products", icon: Flower2 },
  { href: "/production", label: "Production", icon: Factory },
  { href: "/finished-goods", label: "Finished Goods", icon: PackageCheck },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  userEmail,
  signOut,
}: {
  children: ReactNode;
  userEmail?: string;
  signOut?: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar lg:block">
        <div className="flex h-full flex-col">
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flower2 aria-hidden />
              </div>
              <div>
                <div className="font-semibold leading-tight">Pearl Flower</div>
                <div className="text-xs text-muted-foreground">Inventory MVP</div>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              Live Supabase
            </Badge>
          </div>
          <Separator />
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: active ? "secondary" : "ghost" }),
                    "justify-start",
                    active && "font-semibold",
                  )}
                >
                  <Icon data-icon="inline-start" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-3 border-t p-4">
            <div className="text-xs text-muted-foreground">
              {userEmail ?? "Authenticated user"}
            </div>
            {signOut ? (
              <form action={signOut}>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <LogOut data-icon="inline-start" aria-hidden />
                  Sign out
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Flower2 aria-hidden />
            <span className="font-semibold">Pearl Flower</span>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Truck aria-hidden />
            <span className="text-sm text-muted-foreground">
              Handmade costing and stock control
            </span>
          </div>
          <Badge variant="outline">Asia/Jakarta</Badge>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t bg-background p-1 lg:hidden">
        {navItems.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] text-muted-foreground",
                active && "bg-secondary text-foreground",
              )}
            >
              <Icon aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
