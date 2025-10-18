import { type Task } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, MoreVertical, Sparkles, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
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
  onEdit,
  onDelete,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";

  return (
    <Card
      className={cn(
        "group relative border-l-4 p-4 hover-elevate transition-all",
        priorityColors[task.priority as keyof typeof priorityColors],
        isCompleted && "opacity-60"
      )}
      data-testid={`card-task-${task.id}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete?.(task.id)}
          className="mt-0.5"
          data-testid={`checkbox-task-${task.id}`}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
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
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-task-menu-${task.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onEdit?.(task)}
                  data-testid={`button-edit-task-${task.id}`}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(task.id)}
                  className="text-destructive"
                  data-testid={`button-delete-task-${task.id}`}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            <Badge
              variant="outline"
              className={cn("text-xs", priorityBadgeColors[task.priority as keyof typeof priorityBadgeColors])}
              data-testid={`badge-priority-${task.id}`}
            >
              {task.priority}
            </Badge>
            {task.aiCategory && (
              <Badge variant="outline" className="text-xs" data-testid={`badge-category-${task.id}`}>
                {task.aiCategory}
              </Badge>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span data-testid={`text-due-date-${task.id}`}>
                  {format(new Date(task.dueDate), "MMM d")}
                </span>
              </div>
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
