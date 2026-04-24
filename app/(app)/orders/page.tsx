import { OrderCreateForm } from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/layout/page-helpers";
import { OrdersTable } from "@/components/tables/orders-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryState } from "@/lib/data/inventory-loader";

export default async function OrdersPage() {
  const state = await getInventoryState();

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
