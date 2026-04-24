import { Flower2 } from "lucide-react";
import { redirect } from "next/navigation";

import { signInAction } from "@/lib/auth/actions";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  if (!hasSupabaseConfig()) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-4">
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
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flower2 aria-hidden />
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Access your private inventory, costing, production, and sales data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="flex flex-col gap-5">
            {params.error ? (
              <Alert variant="destructive">
                <AlertTitle>Could not sign in</AlertTitle>
                <AlertDescription>{params.error}</AlertDescription>
              </Alert>
            ) : null}
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
            </FieldGroup>
            <Button type="submit">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
