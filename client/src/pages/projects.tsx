import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type Project, type InsertProject, type Task } from "@shared/schema";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectCreationModal } from "@/components/project-creation-modal";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Projects() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const getTaskCount = (projectId: string) => {
    return tasks?.filter(task => task.projectId === projectId).length || 0;
  };

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
      });
    },
  });

  const handleCreateProject = async (data: InsertProject) => {
    await createProjectMutation.mutateAsync(data);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <FolderKanban className="h-6 w-6" />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects?.length || 0} projects
          </p>
        </div>
        <Button 
          data-testid="button-add-project" 
          className="gap-2"
          onClick={() => setShowProjectModal(true)}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const taskCount = getTaskCount(project.id);
            return (
              <Card 
                key={project.id} 
                className="p-4 hover-elevate cursor-pointer" 
                data-testid={`card-project-${project.id}`}
                onClick={() => setLocation(`/projects/${project.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium" data-testid={`text-project-name-${project.id}`}>
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground" data-testid={`text-task-count-${project.id}`}>
                      {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Organize your tasks into projects for better management and focus."
          actionLabel="Create Project"
          onAction={() => setShowProjectModal(true)}
        />
      )}

      <ProjectCreationModal
        open={showProjectModal}
        onOpenChange={setShowProjectModal}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
