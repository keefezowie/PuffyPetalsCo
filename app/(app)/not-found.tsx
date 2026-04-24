import Link from "next/link";

import { PageHeader } from "@/components/layout/page-helpers";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state-views";

export default function NotFound() {
  return (
    <>
      <PageHeader
        title="Record not found"
        description="The item may have been removed, or the link no longer points to an existing record."
        eyebrow="Not found"
      />
      <EmptyState
        title="Nothing to show here"
        description="Return to the dashboard or use navigation to open another workspace."
        action={
          <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
            Back to dashboard
          </Link>
        }
      />
    </>
  );
}
