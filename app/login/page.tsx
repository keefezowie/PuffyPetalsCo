import { Flower2 } from "lucide-react";
import { redirect } from "next/navigation";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "@/components/forms/sign-in-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  if (!hasSupabaseConfig()) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-4 surface-warm">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
            <CardDescription>
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
              to `.env.local`, then restart the dev server.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(params.next ?? "/dashboard");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 surface-warm">
      <Card className="w-full max-w-md shadow-xl shadow-foreground/10">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Flower2 aria-hidden />
          </div>
          <Badge variant="outline" className="mb-1 w-fit">
            Private workspace
          </Badge>
          <CardTitle>Puffy Petals Co.</CardTitle>
          <CardDescription>
            Access your private inventory, costing, production, and sales data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm error={params.error} next={params.next ?? "/dashboard"} />
        </CardContent>
      </Card>
    </main>
  );
}
