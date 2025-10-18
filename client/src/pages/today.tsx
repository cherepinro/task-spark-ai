import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Today() {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <TaskCardSkeleton />
      </div>
    );
  }

  const today = new Date();
  const todayTasks = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate.toDateString() === today.toDateString();
  }) || [];

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Calendar className="h-6 w-6" />
            Today
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-today-date">
            {format(today, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button data-testid="button-add-task" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {todayTasks.length > 0 ? (
        <div className="space-y-3">
          {todayTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No tasks for today"
          description="You have no tasks scheduled for today. Add a task to get started or enjoy your free time."
          actionLabel="Add Task"
        />
      )}
    </div>
  );
}
