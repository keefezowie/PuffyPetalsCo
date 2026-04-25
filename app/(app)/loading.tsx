import { LoadingState, PageSkeleton } from "@/components/ui/state-views";

export default function Loading() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 h-1.5 overflow-hidden bg-primary/15">
        <div className="route-progress-bar h-full w-1/2 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
      </div>
      <div className="flex flex-col gap-5">
        <LoadingState
          title="Loading page"
          description="Fetching the latest records and preparing the detail view..."
          className="shadow-sm"
        />
        <PageSkeleton />
      </div>
    </>
  );
}
