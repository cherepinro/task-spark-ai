import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Zap, Sparkles, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const priorityBadgeColors = {
  low: "bg-chart-2/10 text-chart-2",
  medium: "bg-chart-4/10 text-chart-4",
  high: "bg-chart-5/10 text-chart-5",
};

const statusColors = {
  todo: "text-muted-foreground",
  "in-progress": "text-blue-600",
  completed: "text-green-600",
  archived: "text-gray-500",
};

export default function TaskDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDecomposing, setIsDecomposing] = useState(false);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
    enabled: !!id,
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ index, completed }: { index: number; completed: boolean }) => {
      if (!task || !task.subtasks) return;
      
      const updatedSubtasks = [...task.subtasks];
      updatedSubtasks[index] = { ...updatedSubtasks[index], completed };
      
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, {
        subtasks: updatedSubtasks,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const decomposeTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/decompose", { taskId: id });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const subtaskCount = data.subtasks?.length || 0;
      const totalHours = data.subtasks?.reduce((sum: number, t: any) => sum + (t.hours || 0), 0) || 0;
      toast({
        title: "Задача разбита на подзадачи! ⚡",
        description: `Создано подзадач: ${subtaskCount} (всего ${totalHours.toFixed(1)}ч). Осталось квоты: ${data.remainingQuota}/5`,
      });
      setIsDecomposing(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось разбить задачу",
      });
      setIsDecomposing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Задача не найдена</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            На главную
          </Button>
        </Card>
      </div>
    );
  }

  const handleToggleSubtask = (index: number, completed: boolean) => {
    updateSubtaskMutation.mutate({ index, completed });
  };

  const handleDecompose = () => {
    setIsDecomposing(true);
    decomposeTaskMutation.mutate();
  };

  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад
      </Button>

      <Card className="p-6 space-y-6">
        {/* Task Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold" data-testid="text-task-title">
              {task.title}
            </h1>
            <div className="flex gap-2">
              <Badge className={priorityBadgeColors[task.priority as keyof typeof priorityBadgeColors]}>
                {task.priority}
              </Badge>
              <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                {task.status}
              </Badge>
            </div>
          </div>

          {task.description && (
            <p className="text-muted-foreground" data-testid="text-task-description">
              {task.description}
            </p>
          )}

          {/* Task Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {task.deadlineDateTime && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Срок: {format(new Date(task.deadlineDateTime), "PPP")}</span>
              </div>
            )}
            {task.hours && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{task.hours}ч</span>
              </div>
            )}
            {task.isAISuggested && (
              <div className="flex items-center gap-1 text-primary">
                <Sparkles className="h-4 w-4" />
                <span>AI</span>
              </div>
            )}
          </div>
        </div>

        {/* Subtasks Section */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Подзадачи</h2>
            {!task.subtasks || task.subtasks.length === 0 ? (
              <Button
                onClick={handleDecompose}
                disabled={isDecomposing || decomposeTaskMutation.isPending}
                size="sm"
                data-testid="button-decompose-task"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isDecomposing ? "Разбиваем..." : "Разбить на подзадачи"}
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">
                {completedSubtasks} из {totalSubtasks} выполнено
              </div>
            )}
          </div>

          {task.subtasks && task.subtasks.length > 0 && (
            <>
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${subtaskProgress}%` }}
                ></div>
              </div>

              {/* Subtasks List */}
              <div className="space-y-2">
                {task.subtasks.map((subtask, index) => (
                  <Card
                    key={index}
                    className={cn(
                      "p-3 hover-elevate transition-all",
                      subtask.completed && "opacity-60"
                    )}
                    data-testid={`card-subtask-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={(checked) => handleToggleSubtask(index, checked as boolean)}
                        data-testid={`checkbox-subtask-${index}`}
                      />
                      <div className="flex-1">
                        <p
                          className={cn(
                            "text-sm",
                            subtask.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {subtask.title}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {subtask.hours}ч
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {(!task.subtasks || task.subtasks.length === 0) && !isDecomposing && (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Эта задача еще не разбита на подзадачи</p>
              <p className="text-sm mt-1">Используйте AI, чтобы автоматически создать подзадачи</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
