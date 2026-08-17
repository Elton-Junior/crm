import { Skeleton } from "@/components/ui/skeleton";

export default function ContratoDetalheLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    </div>
  );
}
