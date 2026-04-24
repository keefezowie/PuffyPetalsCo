"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EntitySelectItem = {
  value: string;
  label: string;
  description?: string;
};

export function EntitySelect({
  name,
  value,
  defaultValue,
  onValueChange,
  items,
  placeholder = "Select item",
  disabled,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items: EntitySelectItem[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? "");
  const currentValue = value ?? internalValue;
  const selected = items.find((item) => item.value === currentValue);

  function handleValueChange(nextValue: string | null) {
    if (!nextValue) {
      return;
    }

    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger disabled={disabled || !items.length} className="w-full">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              !selected && "text-muted-foreground",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.label}</span>
                  {item.description ? (
                    <span className="truncate text-xs text-muted-foreground group-focus:text-accent-foreground/80">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
}
