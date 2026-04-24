import { PageHeader } from "@/components/layout/page-helpers";
import { PearlCalculatorForm } from "@/components/forms/pearl-calculator";

export default function PearlCalculatorPage() {
  return (
    <>
      <PageHeader
        title="Pearl Calculator"
        description="Estimate pieces per 15g pack from the corrected 10mm = 33 pcs baseline, then calculate cost per pearl."
      />
      <PearlCalculatorForm />
    </>
  );
}
