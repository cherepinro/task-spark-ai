import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task, type InsertTask } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { TaskCreationModal } from "@/components/task-creation-modal";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, startOfToday, startOfTomorrow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Upcoming() {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "completed" ? "todo" : "completed";
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
    },
  });

  const handleToggleComplete = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      toggleCompleteMutation.mutate({ taskId, currentStatus: task.status });
    }
  };

  const handleCreateTask = async (data: InsertTask) => {
    await createTaskMutation.mutateAsync(data);
    setShowTaskModal(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <TaskCardSkeleton />
      </div>
    );
  }

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
    <>
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
          <Button onClick={() => setShowTaskModal(true)} data-testid="button-add-task" className="gap-2">
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                    />
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
            onAction={() => setShowTaskModal(true)}
          />
        )}
      </div>

      <TaskCreationModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        onSubmit={handleCreateTask}
      />
    </>
  );
}
