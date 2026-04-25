import { PageHeader } from "@/components/layout/page-helpers";
import { ErrorState } from "@/components/ui/state-views";

export function WorkspaceDataError({ message }: { message: string }) {
  return (
    <>
      <PageHeader
        title="Workspace data unavailable"
        description="The app could not load the latest Supabase data for this workspace."
        eyebrow="Supabase error"
      />
      <ErrorState
        title="Supabase request failed"
        description={message}
      />
    </>
  );
}
