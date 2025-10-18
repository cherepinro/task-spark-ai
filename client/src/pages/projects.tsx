import { useQuery } from "@tanstack/react-query";
import { type Project } from "@shared/schema";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Projects() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

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
        <Button data-testid="button-add-project" className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="p-4 hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-xs text-muted-foreground">0 tasks</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Organize your tasks into projects for better management and focus."
          actionLabel="Create Project"
        />
      )}
    </div>
  );
}
