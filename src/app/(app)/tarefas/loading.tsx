import { Skeleton } from "@/components/ui/skeleton";

export default function TarefasLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, section) => (
          <div key={section} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
