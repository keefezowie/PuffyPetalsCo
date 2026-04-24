import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state-views";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 surface-warm">
      <div className="w-full max-w-lg">
        <EmptyState
          title="Page not found"
          description="This route does not exist in the Puffy Petals workspace."
          action={
            <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
              Open dashboard
            </Link>
          }
        />
      </div>
    </main>
  );
}
