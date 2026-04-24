import Image from "next/image";

import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const fallbackImages: Record<string, string> = {
  "FLOWER-CHERRY-BLOSSOMS": "/flowers/cherry-blossoms.svg",
  "FLOWER-ORCHID": "/flowers/orchid.svg",
  "FLOWER-HYDRANGEA": "/flowers/hydrangea.svg",
  "FLOWER-PUFFY-BLUSH": "/flowers/puffy-blush.svg",
};

function fallbackForProduct(product: Pick<Product, "name" | "sku" | "photoUrl">) {
  if (product.photoUrl) {
    return product.photoUrl;
  }

  const keyed = fallbackImages[product.sku];
  if (keyed) {
    return keyed;
  }

  const name = product.name.toLocaleLowerCase();
  if (name.includes("orchid")) {
    return "/flowers/orchid.svg";
  }
  if (name.includes("hydrangea")) {
    return "/flowers/hydrangea.svg";
  }
  if (name.includes("puffy") || name.includes("blush")) {
    return "/flowers/puffy-blush.svg";
  }
  if (name.includes("cherry")) {
    return "/flowers/cherry-blossoms.svg";
  }

  return "/flowers/flower-placeholder.svg";
}

export function ProductImage({
  product,
  className,
  size = 48,
}: {
  product: Pick<Product, "name" | "sku" | "photoUrl">;
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src={fallbackForProduct(product)}
      alt={product.name}
      width={size}
      height={size}
      className={cn(
        "aspect-square shrink-0 rounded-md border bg-muted object-cover",
        className,
      )}
    />
  );
}
