import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmptyState } from "@/components/empty-state";
import { FileCode2, Plus, Play, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { TaskTemplate } from "@shared/schema";
import { TaskCardSkeleton } from "@/components/loading-state";

export default function Templates() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const createTaskFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("POST", `/api/templates/${templateId}/create-task`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Задача создана",
        description: "Задача успешно создана из шаблона.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать задачу из шаблона.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/templates/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Шаблон удален",
        description: "Шаблон был удален.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить шаблон.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = async (templateId: string) => {
    await createTaskFromTemplateMutation.mutateAsync(templateId);
  };

  const handleDeleteClick = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplateMutation.mutateAsync(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <TaskCardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <FileCode2 className="h-6 w-6" />
          Шаблоны задач
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Сохраняйте часто используемые задачи как шаблоны для быстрого создания
        </p>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-template-name-${template.id}`}>
                      {template.name}
                    </CardTitle>
                    <CardDescription className="truncate mt-1">
                      {template.title}
                    </CardDescription>
                  </div>
                  <Badge className={getPriorityColor(template.priority)}>
                    {template.priority}
                  </Badge>
                </div>
              </CardHeader>

              {template.description && (
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </CardContent>
              )}

              <CardFooter className="flex items-center justify-between gap-2 pt-3 border-t">
                <div className="flex items-center gap-1">
                  {template.isRecurring && (
                    <Badge variant="outline" className="text-xs">
                      {template.recurrencePattern}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCreateTask(template.id)}
                    data-testid={`button-use-template-${template.id}`}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Использовать
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteClick(template.id)}
                    data-testid={`button-delete-template-${template.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileCode2}
          title="Пока нет шаблонов"
          description="Создавайте шаблоны из своих задач, чтобы быстро создавать похожие задачи в будущем."
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить шаблон</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот шаблон? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
