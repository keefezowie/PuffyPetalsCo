"use client";

import { useEffect } from "react";

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
    <main className="flex min-h-svh items-center justify-center bg-background p-4 surface-warm">
      <div className="w-full max-w-lg">
        <ErrorState
          title="Application error"
          description={error.digest ? `Reference: ${error.digest}` : error.message}
          action={<RetryButton onClick={unstable_retry} />}
        />
      </div>
    </main>
  );
}
