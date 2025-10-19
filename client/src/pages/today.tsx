import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type InsertTask, type UserSettings } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { TaskCreationModal } from "@/components/task-creation-modal";
import { SaveTemplateDialog } from "@/components/save-template-dialog";
import { FocusSprint } from "@/components/focus-sprint";
import { Calendar, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFilteredTasks } from "@/hooks/use-filtered-tasks";
import { useSaveTemplate } from "@/hooks/use-save-template";

export default function Today() {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFocusSprint, setShowFocusSprint] = useState(false);
  const { toast } = useToast();
  const {
    taskToSave,
    dialogOpen,
    setDialogOpen,
    handleSaveAsTemplate,
    handleSaveTemplate,
  } = useSaveTemplate();

  const { data: tasks, isLoading } = useFilteredTasks();
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
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

  const today = new Date();
  const todayTasks = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate.toDateString() === today.toDateString();
  }) || [];

  return (
    <>
      {showFocusSprint && (
        <FocusSprint
          sound={settings?.focusSprintSound || "soft-chime"}
          onClose={() => setShowFocusSprint(false)}
        />
      )}
      
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
          <div className="flex items-center gap-2">
            {settings?.focusSprintEnabled && (
              <Button
                variant="outline"
                onClick={() => setShowFocusSprint(true)}
                data-testid="button-start-sprint"
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Start 10-min Sprint
              </Button>
            )}
            <Button onClick={() => setShowTaskModal(true)} data-testid="button-add-task" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={(id) => deleteTaskMutation.mutate(id)}
                onSaveAsTemplate={handleSaveAsTemplate}
                onBreakdown={handleBreakdownTask}
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

      <SaveTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={taskToSave}
        onSave={handleSaveTemplate}
      />
    </>
  );
}
