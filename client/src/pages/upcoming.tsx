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
  const [editingTask, setEditingTask] = useState<any | null>(null);
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

  const upcomingTasks = tasks?.filter((t) => {
    if (t.status === "completed" || t.status === "archived") return false;
    
    // Check both dueDate and deadlineDateTime for upcoming tasks
    let taskDate: Date | null = null;
    if (t.dueDate) {
      taskDate = new Date(t.dueDate);
    } else if (t.deadlineDateTime) {
      taskDate = new Date(t.deadlineDateTime);
    }
    
    if (!taskDate) return false;
    return isAfter(taskDate, startOfToday());
  }).sort((a, b) => {
    // Sort by whichever date is available (dueDate or deadlineDateTime)
    const dateA = a.dueDate ? new Date(a.dueDate) : a.deadlineDateTime ? new Date(a.deadlineDateTime) : null;
    const dateB = b.dueDate ? new Date(b.dueDate) : b.deadlineDateTime ? new Date(b.deadlineDateTime) : null;
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  }) || [];

  const groupedTasks = upcomingTasks.reduce((acc, task) => {
    // Use whichever date is available for grouping
    const taskDate = task.dueDate ? new Date(task.dueDate) : task.deadlineDateTime ? new Date(task.deadlineDateTime) : null;
    if (!taskDate) return acc;
    const dateKey = format(taskDate, "yyyy-MM-dd");
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
              Предстоящие
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {upcomingTasks.length} {upcomingTasks.length === 1 ? 'предстоящая задача' : upcomingTasks.length < 5 ? 'предстоящие задачи' : 'предстоящих задач'}
            </p>
          </div>
          <Button onClick={() => setShowTaskModal(true)} data-testid="button-add-task" className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить задачу
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
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Нет предстоящих задач"
            description="У вас нет задач, запланированных на будущее. Добавьте задачи с датами выполнения, чтобы увидеть их здесь."
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
    </>
  );
}
