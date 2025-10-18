import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, startOfToday, startOfTomorrow } from "date-fns";

export default function Upcoming() {
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

  const tomorrow = startOfTomorrow();
  const upcomingTasks = tasks?.filter((t) => {
    if (!t.dueDate || t.status === "completed" || t.status === "archived") return false;
    const dueDate = new Date(t.dueDate);
    return isAfter(dueDate, startOfToday());
  }).sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }) || [];

  const groupedTasks = upcomingTasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <CalendarDays className="h-6 w-6" />
            Upcoming
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {upcomingTasks.length} upcoming tasks
          </p>
        </div>
        <Button data-testid="button-add-task" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {upcomingTasks.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([dateKey, dateTasks]) => (
            <div key={dateKey}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2" data-testid={`text-date-group-${dateKey}`}>
                {format(new Date(dateKey), "EEEE, MMMM d")}
              </h2>
              <div className="space-y-3">
                {dateTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming tasks"
          description="You have no tasks scheduled for the future. Add tasks with due dates to see them here."
          actionLabel="Add Task"
        />
      )}
    </div>
  );
}
