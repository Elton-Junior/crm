import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-6">
        <Skeleton className="h-[600px] flex-1" />
        <Skeleton className="h-[600px] w-64 shrink-0" />
      </div>
    </div>
  );
}
