import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task, type Project, type InsertTask } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { TaskCreationModal } from "@/components/task-creation-modal";
import { FolderKanban, Plus, ArrowLeft, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState("");
  const { toast } = useToast();

  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: tasks, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { projectId: id }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?projectId=${id}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!id,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const taskData = { ...data, projectId: id };
      const res = await apiRequest("POST", "/api/tasks", taskData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been added to this project.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create task.",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, { name });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Project updated",
        description: "Project name has been updated successfully.",
      });
      setShowEditDialog(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update project.",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully.",
      });
      setLocation("/projects");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete project.",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete task.",
      });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "completed" ? "todo" : "completed";
      const completedAt = newStatus === "completed" ? new Date() : null;
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        status: newStatus,
        completedAt,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleCreateTask = async (data: InsertTask) => {
    await createTaskMutation.mutateAsync(data);
    setShowTaskModal(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleUpdateTask = async (data: InsertTask) => {
    if (editingTask) {
      await apiRequest("PATCH", `/api/tasks/${editingTask.id}`, data);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
      setShowTaskModal(false);
      setEditingTask(null);
    } else {
      await handleCreateTask(data);
    }
  };

  const handleToggleComplete = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      toggleCompleteMutation.mutate({ taskId, currentStatus: task.status });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleEditProject = () => {
    setEditedProjectName(project?.name || "");
    setShowEditDialog(true);
  };

  const handleSaveProjectName = () => {
    if (editedProjectName.trim()) {
      updateProjectMutation.mutate(editedProjectName.trim());
    }
  };

  const handleDeleteProject = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteProject = () => {
    deleteProjectMutation.mutate();
  };

  if (isLoadingProject || isLoadingTasks) {
    return (
      <div className="p-6">
        <TaskCardSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FolderKanban}
          title="Project not found"
          description="The project you're looking for doesn't exist."
          actionLabel="Back to Projects"
          onAction={() => setLocation("/projects")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/projects")}
          className="mb-4 gap-2"
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-project-name">
                {project.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {tasks?.filter(t => t.status !== "completed" && t.status !== "archived").length || 0} tasks
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleEditProject}
              className="gap-2"
              data-testid="button-edit-project"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteProject}
              className="gap-2 text-destructive hover:bg-destructive/10"
              data-testid="button-delete-project"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              onClick={() => setShowTaskModal(true)}
              className="gap-2"
              data-testid="button-add-task"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No tasks in this project"
          description="Add tasks to organize your work within this project."
          actionLabel="Add Task"
          onAction={() => setShowTaskModal(true)}
        />
      )}

      <TaskCreationModal
        open={showTaskModal}
        onOpenChange={(open) => {
          setShowTaskModal(open);
          if (!open) setEditingTask(null);
        }}
        onSubmit={handleUpdateTask}
        initialTask={editingTask}
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="dialog-edit-project">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Change the name of your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={editedProjectName}
                onChange={(e) => setEditedProjectName(e.target.value)}
                placeholder="Enter project name"
                data-testid="input-project-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProjectName}
              disabled={!editedProjectName.trim() || updateProjectMutation.isPending}
              data-testid="button-save-project"
            >
              {updateProjectMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-project">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the project "{project.name}" and remove it from all tasks.
              Tasks will not be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
