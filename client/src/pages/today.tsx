import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task, type InsertTask } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { TaskCreationModal } from "@/components/task-creation-modal";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Today() {
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

  const today = new Date();
  const todayTasks = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate.toDateString() === today.toDateString();
  }) || [];

  return (
    <>
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
          <Button onClick={() => setShowTaskModal(true)} data-testid="button-add-task" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={(id) => deleteTaskMutation.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No tasks for today"
            description="You have no tasks scheduled for today. Add a task to get started or enjoy your free time."
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
