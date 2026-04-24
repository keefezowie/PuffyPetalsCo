import { SettingsUpdateForm } from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/layout/page-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, StatusBadge } from "@/components/ui/data-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInventoryState } from "@/lib/data/inventory-loader";
import { formatPercent, formatRupiah } from "@/lib/formatters";

export default async function SettingsPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Single-user operating assumptions for costing, stock control, and platform fees."
        eyebrow="Admin"
      />

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SettingsUpdateForm state={state} />

        <Card>
          <CardHeader>
            <CardTitle>Platform Fee Rules</CardTitle>
            <CardDescription>Recommended price uses total cost / (1 - target margin - platform fee).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Fee Rate</TableHead>
                  <TableHead>Fixed Fee</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.platformFeeRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.platform}</TableCell>
                    <TableCell>{formatPercent(rule.feeRate)}</TableCell>
                    <TableCell><MoneyCell value={formatRupiah(rule.fixedFee)} /></TableCell>
                    <TableCell>
                      <StatusBadge tone={rule.active ? "success" : "info"}>
                        {rule.active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
