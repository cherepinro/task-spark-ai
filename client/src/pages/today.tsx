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
  const [editingTask, setEditingTask] = useState<any | null>(null);
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
        title: "Задача удалена",
        description: "Задача успешно удалена.",
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
        title: "Задача создана",
        description: "Ваша задача успешно создана.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Не удалось создать задачу",
        description: error.message || "Произошла ошибка при создании задачи. Попробуйте снова.",
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

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleUpdateTask = async (data: InsertTask) => {
    if (editingTask) {
      await apiRequest("PATCH", `/api/tasks/${editingTask.id}`, data);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Задача обновлена",
        description: "Ваша задача успешно обновлена.",
      });
      setShowTaskModal(false);
      setEditingTask(null);
    } else {
      await handleCreateTask(data);
    }
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
    // Priority 1: Show tasks with actual deadline today
    if (t.deadlineDateTime) {
      const deadlineDate = new Date(t.deadlineDateTime);
      if (deadlineDate.toDateString() === today.toDateString()) return true;
    }
    
    // Priority 2: Show tasks scheduled for today ONLY if they have no deadline set
    // This prevents low-priority tasks with distant deadlines from appearing
    if (t.dueDate && !t.deadlineDateTime) {
      const dueDate = new Date(t.dueDate);
      if (dueDate.toDateString() === today.toDateString()) return true;
    }
    
    return false;
  }).sort((a, b) => {
    // Sort by time (earliest to latest), then by priority within same time
    const timeA = a.deadlineDateTime ? new Date(a.deadlineDateTime) : a.dueDate ? new Date(a.dueDate) : null;
    const timeB = b.deadlineDateTime ? new Date(b.deadlineDateTime) : b.dueDate ? new Date(b.dueDate) : null;
    
    if (!timeA || !timeB) return 0;
    
    // Compare times first
    const timeDiff = timeA.getTime() - timeB.getTime();
    if (timeDiff !== 0) return timeDiff; // Earlier time comes first
    
    // If times are the same, sort by priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
    return aPriority - bPriority;
  }) || [];

  return (
    <>
      {showFocusSprint && (
        <FocusSprint
          sound={(settings?.focusSprintSound as "soft-chime" | "white-noise" | "nature-sounds") || "soft-chime"}
          onClose={() => setShowFocusSprint(false)}
        />
      )}
      
      <div className="min-h-screen p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Calendar className="h-6 w-6" />
              Сегодня
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
                Старт 10-мин Спринт
              </Button>
            )}
            <Button onClick={() => setShowTaskModal(true)} data-testid="button-add-task" className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить задачу
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
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="Нет задач на сегодня"
            description="У вас нет задач, запланированных на сегодня. Добавьте задачу, чтобы начать, или наслаждайтесь свободным временем."
            actionLabel="Добавить задачу"
            onAction={() => setShowTaskModal(true)}
          />
        )}
      </div>

      <TaskCreationModal
        open={showTaskModal}
        onOpenChange={(open) => {
          setShowTaskModal(open);
          if (!open) setEditingTask(null);
        }}
        onSubmit={handleUpdateTask}
        initialTask={editingTask}
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
