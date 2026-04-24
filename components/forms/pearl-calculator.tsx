"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatRupiahDecimal } from "@/lib/formatters";
import { calculatePearlEstimate } from "@/lib/services/inventory";
import { pearlCalculatorSchema } from "@/lib/validations";

type PearlCalculatorInput = z.input<typeof pearlCalculatorSchema>;
type PearlCalculatorValues = z.output<typeof pearlCalculatorSchema>;

export function PearlCalculatorForm() {
  const form = useForm<PearlCalculatorInput, unknown, PearlCalculatorValues>({
    resolver: zodResolver(pearlCalculatorSchema),
    defaultValues: {
      sizeMm: 12,
      packPrice: 4500,
      packWeightGram: 15,
      actualCountedPcsPerPack: undefined,
    },
    mode: "onChange",
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const values = form.watch();
  const parsed = pearlCalculatorSchema.safeParse(values);
  const result = useMemo(() => {
    if (!parsed.success) {
      return null;
    }

    const estimate = calculatePearlEstimate(parsed.data.sizeMm);
    const unitsForCost =
      parsed.data.actualCountedPcsPerPack ?? estimate.exactPcs;
    const roundedPlanningCost = parsed.data.packPrice / estimate.roundedPcs;
    return {
      ...estimate,
      exactUnitCost: parsed.data.packPrice / unitsForCost,
      roundedPlanningCost,
      source: parsed.data.actualCountedPcsPerPack
        ? "manually verified count"
        : "formula estimate",
    };
  }, [parsed]);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
          <CardDescription>Use 10mm = 33 pcs per 15g as the baseline.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.sizeMm}>
                <FieldLabel htmlFor="sizeMm">Pearl size in mm</FieldLabel>
                <Input id="sizeMm" type="number" step="0.1" {...form.register("sizeMm")} />
                <FieldError errors={[form.formState.errors.sizeMm]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.packWeightGram}>
                <FieldLabel htmlFor="packWeightGram">Pack weight in grams</FieldLabel>
                <Input id="packWeightGram" type="number" step="0.1" {...form.register("packWeightGram")} />
                <FieldDescription>The MVP baseline prices are for 15g packs.</FieldDescription>
                <FieldError errors={[form.formState.errors.packWeightGram]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.packPrice}>
                <FieldLabel htmlFor="packPrice">Pack price in Rupiah</FieldLabel>
                <Input id="packPrice" type="number" {...form.register("packPrice")} />
                <FieldError errors={[form.formState.errors.packPrice]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.actualCountedPcsPerPack}>
                <FieldLabel htmlFor="actualCountedPcsPerPack">Manual counted pcs override</FieldLabel>
                <Input
                  id="actualCountedPcsPerPack"
                  type="number"
                  placeholder="Optional"
                  {...form.register("actualCountedPcsPerPack")}
                />
                <FieldDescription>Use this after physically counting a pack.</FieldDescription>
                <FieldError errors={[form.formState.errors.actualCountedPcsPerPack]} />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator aria-hidden />
            Pearl Estimate
          </CardTitle>
          <CardDescription>
            Formula: estimated pcs = 33 × (10 / size_mm)^3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Formula" value={result.formula} />
              <Metric label="Quantity source" value={result.source} />
              <Metric label="Exact estimated pcs" value={result.exactPcs.toFixed(2)} />
              <Metric label="Rounded planning pcs" value={`${result.roundedPcs} pcs`} />
              <Metric label="Exact unit cost" value={formatRupiahDecimal(result.exactUnitCost)} />
              <Metric
                label="Rounded planning cost"
                value={formatRupiahDecimal(result.roundedPlanningCost)}
              />
              {parsed.success && parsed.data.sizeMm === 12 ? (
                <div className="sm:col-span-2">
                  <Badge variant="secondary">
                    12mm check: about 19 pcs per 15g and Rp236.84 using rounded planning count
                  </Badge>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Enter valid values to calculate cost.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
