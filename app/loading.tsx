import { PageSkeleton } from "@/components/ui/state-views";

export default function Loading() {
  return (
    <main className="min-h-svh bg-background p-4 md:p-6">
      <PageSkeleton />
    </main>
  );
}
