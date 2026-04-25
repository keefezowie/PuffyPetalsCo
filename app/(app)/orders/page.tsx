import { OrderCreateForm } from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/layout/page-helpers";
import { OrdersTable } from "@/components/tables/orders-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryStateResult } from "@/lib/data/inventory-loader";
import { WorkspaceDataError } from "@/components/ui/workspace-data-error";

export default async function OrdersPage() {
  const stateResult = await getInventoryStateResult();
  if (!stateResult.ok) {
    return <WorkspaceDataError message={stateResult.error} />;
  }

  const state = stateResult.state;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track platform orders, status, revenue, COGS, and profit without double-deducting stock."
        eyebrow="Sales operations"
        action={<OrderCreateForm state={state} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>Sales Orders</CardTitle>
          <CardDescription>Status transitions control reservation and fulfillment behavior.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrdersTable state={state} />
        </CardContent>
      </Card>
    </>
  );
}
