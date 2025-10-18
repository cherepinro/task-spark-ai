import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { Archive as ArchiveIcon } from "lucide-react";
import { useFilteredTasks } from "@/hooks/use-filtered-tasks";

export default function Archive() {
  const { data: tasks, isLoading } = useFilteredTasks();

  if (isLoading) {
    return (
      <div className="p-6">
        <TaskCardSkeleton />
      </div>
    );
  }

  const archivedTasks = tasks?.filter((t) => t.status === "archived") || [];

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <ArchiveIcon className="h-6 w-6" />
          Archive
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {archivedTasks.length} archived tasks
        </p>
      </div>

      {archivedTasks.length > 0 ? (
        <div className="space-y-3">
          {archivedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ArchiveIcon}
          title="No archived tasks"
          description="Tasks you archive will appear here for future reference."
        />
      )}
    </div>
  );
}
