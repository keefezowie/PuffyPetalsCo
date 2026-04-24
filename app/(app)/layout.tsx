import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { signOutAction } from "@/lib/auth/actions";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function ApplicationLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!hasSupabaseConfig()) {
    return (
      <AppShell>
        <div className="rounded-lg border bg-card p-4">
          <h1 className="text-xl font-semibold">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
            to `.env.local`, then restart the dev server.
          </p>
        </div>
      </AppShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell userEmail={user.email ?? undefined} signOut={signOutAction}>
      {children}
    </AppShell>
  );
}
