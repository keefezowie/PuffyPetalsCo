import { PageSkeleton } from "@/components/ui/state-views";

export default function Loading() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/15">
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>
      <PageSkeleton />
    </>
  );
}
