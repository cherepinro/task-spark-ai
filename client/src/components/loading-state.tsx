import { Skeleton } from "@/components/ui/skeleton";

export function TaskCardSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-l-4 border-l-muted p-4"
          data-testid={`skeleton-task-${i}`}
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" data-testid={`skeleton-metric-${i}`} />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" data-testid="skeleton-chart" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}
