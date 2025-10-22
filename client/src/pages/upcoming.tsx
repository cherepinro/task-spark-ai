import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type InsertTask, type Task } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { TaskCreationModal } from "@/components/task-creation-modal";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, startOfToday, startOfTomorrow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFilteredTasks } from "@/hooks/use-filtered-tasks";

export default function Upcoming() {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const { toast } = useToast();

  const { data: tasks, isLoading } = useFilteredTasks();

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
      const res = await apiRequest("POST", "/api/tasks", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create task",
        description: error.message || "An error occurred while creating the task. Please try again.",
      });
    },
  });

  const breakdownTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/ai/decompose", { title });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const taskCount = data.tasks?.length || 0;
      const totalHours = data.tasks?.reduce((sum: number, t: any) => sum + (t.hours || 0), 0) || 0;
      toast({
        title: "Task broken down successfully! ⚡",
        description: `Created ${taskCount} subtasks (${totalHours}h total). Remaining quota: ${data.remainingQuota}/5`,
      });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to breakdown task";
      toast({
        title: "Breakdown failed",
        description: message,
        variant: "destructive",
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

  const handleBreakdownTask = (task: any) => {
    breakdownTaskMutation.mutate(task.title);
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
                      onBreakdown={handleBreakdownTask}
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
