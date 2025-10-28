import { type Task } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sparkles, FolderKanban, Repeat, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (taskId: string) => void;
}

const priorityColors = {
  low: "border-l-chart-2",
  medium: "border-l-chart-4",
  high: "border-l-chart-5",
};

const priorityBadgeColors = {
  low: "bg-chart-2/10 text-chart-2",
  medium: "bg-chart-4/10 text-chart-4",
  high: "bg-chart-5/10 text-chart-5",
};

export function TaskCard({
  task,
  onToggleComplete,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const [, navigate] = useLocation();

  const handleNavigateToTask = () => {
    navigate(`/tasks/${task.id}`);
  };

  return (
    <Card
      className={cn(
        "group relative border-l-4 p-4 hover-elevate transition-all cursor-pointer",
        priorityColors[task.priority as keyof typeof priorityColors],
        isCompleted && "opacity-60"
      )}
      data-testid={`card-task-${task.id}`}
      onClick={handleNavigateToTask}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => {
            onToggleComplete?.(task.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
          data-testid={`checkbox-task-${task.id}`}
        />
        <div className="flex-1 space-y-2">
          <div className="flex-1">
            <h3
              className={cn(
                "text-base font-medium leading-tight",
                isCompleted && "line-through"
              )}
              data-testid={`text-task-title-${task.id}`}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2 break-all overflow-hidden">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {task.dueDate && (
              <Badge
                variant="outline"
                className="gap-1 border-chart-1/30 bg-chart-1/5 text-chart-1 text-xs"
                data-testid={`badge-due-date-${task.id}`}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), "d MMM")}
              </Badge>
            )}
            {task.deadlineDateTime && (
              <Badge
                variant="outline"
                className="gap-1 border-destructive/30 bg-destructive/5 text-destructive text-xs"
                data-testid={`badge-deadline-${task.id}`}
              >
                <Clock className="h-3 w-3" />
                {format(new Date(task.deadlineDateTime), "d MMM, HH:mm")}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-xs", priorityBadgeColors[task.priority as keyof typeof priorityBadgeColors])}
              data-testid={`badge-priority-${task.id}`}
            >
              {task.priority}
            </Badge>
            {task.hours && (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/5 text-primary text-xs"
                data-testid={`badge-hours-${task.id}`}
              >
                <Clock className="h-3 w-3" />
                {task.hours}h
              </Badge>
            )}
            {task.isRecurring && (
              <Badge
                variant="outline"
                className="gap-1 border-chart-3/30 bg-chart-3/5 text-chart-3 text-xs"
                data-testid={`badge-recurring-${task.id}`}
              >
                <Repeat className="h-3 w-3" />
                {task.recurrencePattern && 
                  task.recurrencePattern.charAt(0).toUpperCase() + task.recurrencePattern.slice(1)
                }
              </Badge>
            )}
            {task.isAISuggested && (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/5 text-primary text-xs"
                data-testid={`badge-ai-suggested-${task.id}`}
              >
                <Sparkles className="h-3 w-3" />
                AI Suggested
              </Badge>
            )}
            {task.aiCategory && (
              <Badge variant="outline" className="text-xs" data-testid={`badge-category-${task.id}`}>
                {task.aiCategory}
              </Badge>
            )}
            {task.projectId && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FolderKanban className="h-3 w-3" />
                <span data-testid={`text-project-${task.id}`}>Project</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
