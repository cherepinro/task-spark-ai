import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@shared/schema";

export function useSaveTemplate() {
  const [taskToSave, setTaskToSave] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ task, name }: { task: Task; name: string }) => {
      return await apiRequest("POST", "/api/templates", {
        name,
        title: task.title,
        description: task.description,
        priority: task.priority,
        projectId: task.projectId,
        isRecurring: task.isRecurring,
        recurrencePattern: task.recurrencePattern,
        recurrenceInterval: task.recurrenceInterval,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template saved",
        description: "Task has been saved as a template.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template.",
        variant: "destructive",
      });
    },
  });

  const handleSaveAsTemplate = (task: Task) => {
    setTaskToSave(task);
    setDialogOpen(true);
  };

  const handleSaveTemplate = async (templateName: string) => {
    if (taskToSave) {
      await saveTemplateMutation.mutateAsync({
        task: taskToSave,
        name: templateName,
      });
      setDialogOpen(false);
      setTaskToSave(null);
    }
  };

  return {
    taskToSave,
    dialogOpen,
    setDialogOpen,
    handleSaveAsTemplate,
    handleSaveTemplate,
  };
}
