"use client";

import {
  Boxes,
  Calculator,
  ChevronRight,
  Factory,
  FileText,
  Flower2,
  Home,
  LogOut,
  Menu,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/materials", label: "Materials", icon: Boxes },
      { href: "/products", label: "Products", icon: Flower2 },
      { href: "/finished-goods", label: "Finished Goods", icon: PackageCheck },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/purchases", label: "Purchases", icon: PackagePlus },
      { href: "/production", label: "Production", icon: Factory },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/pearl-calculator", label: "Pearl Calculator", icon: Calculator },
      { href: "/suppliers", label: "Suppliers", icon: Store },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
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
  const navItems = navGroups.flatMap((group) => group.items);
  const mobileNavItems = ["/dashboard", "/materials", "/products", "/orders"]
    .map((href) => navItems.find((item) => item.href === href))
    .filter((item): item is (typeof navItems)[number] => Boolean(item));
  const currentItem = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const breadcrumbParts = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " "));

  return (
    <div className="min-h-svh surface-warm bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-sidebar/95 backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Flower2 aria-hidden />
              </div>
              <div>
                <div className="font-semibold leading-tight">Puffy Petals Co.</div>
                <div className="text-xs text-muted-foreground">Inventory and costing</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Live Supabase</Badge>
              <Badge variant="outline">Asia/Jakarta</Badge>
            </div>
          </div>
          <Separator />
          <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
            {navGroups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            ))}
          </nav>
          <div className="flex flex-col gap-3 border-t p-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Signed in as</div>
              <div className="truncate text-sm">{userEmail ?? "Authenticated user"}</div>
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
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}>
                <Menu aria-hidden />
                <span className="sr-only">Open navigation</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Navigate through every workspace route.</SheetDescription>
                </SheetHeader>
                <div className="flex h-full flex-col bg-sidebar">
                  <div className="flex items-center gap-2 border-b p-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Flower2 aria-hidden />
                    </div>
                    <div>
                      <div className="font-semibold">Puffy Petals Co.</div>
                      <div className="text-xs text-muted-foreground">Operations workspace</div>
                    </div>
                  </div>
                  <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
                    {navGroups.map((group) => (
                      <div key={group.label} className="flex flex-col gap-1">
                        <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </div>
                        {group.items.map((item) => (
                          <NavLink key={item.href} item={item} pathname={pathname} />
                        ))}
                      </div>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">
                {currentItem?.label ?? "Workspace"}
              </span>
              <div className="hidden items-center gap-1 text-xs capitalize text-muted-foreground sm:flex">
                {breadcrumbParts.map((part, index) => (
                  <span key={`${part}-${index}`} className="flex items-center gap-1">
                    {index > 0 ? <ChevronRight aria-hidden className="size-3" /> : null}
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Truck aria-hidden />
            <span className="text-sm text-muted-foreground">
              Handmade costing, stock, and fulfillment
            </span>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">
            Asia/Jakarta
          </Badge>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-20 md:p-6 lg:pb-6">
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t bg-background/95 p-1 backdrop-blur lg:hidden">
        {mobileNavItems.map((item) => {
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

function NavLink({
  item,
  pathname,
}: {
  item: (typeof navGroups)[number]["items"][number];
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: active ? "secondary" : "ghost" }),
        "h-9 justify-start gap-2",
        active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
      )}
    >
      <Icon data-icon="inline-start" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
