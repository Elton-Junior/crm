import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="size-4" />
      </span>
      {iconOnly ? null : <span>CRM</span>}
    </span>
  );
}
