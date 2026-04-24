import { PageHeader } from "@/components/layout/page-helpers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  const settings = state.settings;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Single-user operating assumptions for costing, stock control, and platform fees."
      />

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Rules</CardTitle>
            <CardDescription>Negative stock is blocked by default for reliable costing.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field orientation="horizontal">
                <Switch checked={settings.allowNegativeStock} disabled />
                <div>
                  <FieldLabel>Allow negative stock</FieldLabel>
                  <FieldDescription>Disabled for MVP unless explicitly changed in Supabase settings.</FieldDescription>
                </div>
              </Field>
              <Field>
                <FieldLabel>Costing method</FieldLabel>
                <Input value={settings.costingMethod.replaceAll("_", " ")} readOnly />
              </Field>
              <Field>
                <FieldLabel>Default target margin</FieldLabel>
                <Input value={formatPercent(settings.targetMargin)} readOnly />
              </Field>
              <Field>
                <FieldLabel>Labor rate per hour</FieldLabel>
                <Input value={formatRupiah(settings.laborRatePerHour)} readOnly />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

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
                    <TableCell>{formatRupiah(rule.fixedFee)}</TableCell>
                    <TableCell>
                      <Badge variant={rule.active ? "secondary" : "outline"}>
                        {rule.active ? "Active" : "Inactive"}
                      </Badge>
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
