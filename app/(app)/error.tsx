"use client";

import { useEffect } from "react";

import { PageHeader } from "@/components/layout/page-helpers";
import { ErrorState, RetryButton } from "@/components/ui/state-views";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader
        title="Workspace unavailable"
        description="The current view could not be loaded. This is usually a temporary data or network issue."
        eyebrow="Error state"
      />
      <ErrorState
        title="Could not load this workspace"
        description={error.digest ? `Reference: ${error.digest}` : error.message}
        action={<RetryButton onClick={unstable_retry} />}
      />
    </>
  );
}
