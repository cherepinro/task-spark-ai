import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type AIInsight, type InsertTask } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { DashboardSkeleton } from "@/components/loading-state";
import { TaskCreationModal } from "@/components/task-creation-modal";
import { SaveTemplateDialog } from "@/components/save-template-dialog";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { ReorganizeSwipe } from "@/components/reorganize-swipe";
import { UsageWidget } from "@/components/usage-widget";
import { CheckCircle2, Clock, TrendingUp, Sparkles, ListTodo, Plus, ListChecks, ArrowDownUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFilteredTasks } from "@/hooks/use-filtered-tasks";
import { useSaveTemplate } from "@/hooks/use-save-template";

export default function Dashboard() {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showReorganizeDrawer, setShowReorganizeDrawer] = useState(false);
  const { toast } = useToast();
  const {
    taskToSave,
    dialogOpen,
    setDialogOpen,
    handleSaveAsTemplate,
    handleSaveTemplate,
  } = useSaveTemplate();

  const { data: tasks, isLoading: tasksLoading } = useFilteredTasks();

  const { data: insights, isLoading: insightsLoading } = useQuery<AIInsight[]>({
    queryKey: ["/api/insights"],
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
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
    },
  });

  const breakdownTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/ai/decompose", { title });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const taskCount = data.tasks?.length || 0;
      const totalHours = data.tasks?.reduce((sum: number, t: any) => sum + (t.hours || 0), 0) || 0;
      toast({
        title: "Task broken down successfully! ⚡",
        description: `Created ${taskCount} subtasks (${totalHours}h total). Remaining quota: ${data.remainingQuota}/5`,
      });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to breakdown task";
      toast({
        title: "Breakdown failed",
        description: message,
        variant: "destructive",
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

  const handleBreakdownTask = (task: any) => {
    breakdownTaskMutation.mutate(task.title);
  };

  if (tasksLoading || insightsLoading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
  const totalTasks = tasks?.length || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const todayTasks = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(t.dueDate);
    return dueDate.toDateString() === today.toDateString();
  }).length || 0;

  const upcomingTasks = tasks?.filter(
    (t) => t.status !== "completed" && t.status !== "archived"
  ).slice(0, 5) || [];

  return (
    <>
      <div className="min-h-screen p-6 space-y-6">
        {/* AI Insights Hero */}
        <div className="relative rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold" data-testid="text-ai-insights-title">
              AI-Powered Insights
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <CheckCircle2 className="h-4 w-4 text-chart-3" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold" data-testid="text-completion-rate">
                  {Math.round(completionRate)}%
                </p>
                <Progress value={completionRate} className="h-2" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Due Today</span>
                <Clock className="h-4 w-4 text-chart-4" />
              </div>
              <p className="text-2xl font-bold" data-testid="text-today-count">
                {todayTasks}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                tasks need attention
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Productivity</span>
                <TrendingUp className="h-4 w-4 text-chart-2" />
              </div>
              <p className="text-2xl font-bold text-chart-3" data-testid="text-productivity">
                Good
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                On track this week
              </p>
            </Card>
          </div>
        </div>

        {/* Usage Limits */}
        <UsageWidget />

        {/* Today's Focus */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Today's Focus
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowReorganizeDrawer(true)}
                size="sm"
                variant="outline"
                className="gap-2"
                data-testid="button-reorganize"
                disabled={upcomingTasks.length === 0}
              >
                <ArrowDownUp className="h-4 w-4" />
                Reorganize
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                size="sm"
                variant="outline"
                className="gap-2"
                data-testid="button-import-checklist"
              >
                <ListChecks className="h-4 w-4" />
                Import Checklist
              </Button>
              <Button onClick={() => setShowTaskModal(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
          {upcomingTasks.length > 0 ? (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onDelete={(id) => deleteTaskMutation.mutate(id)}
                  onSaveAsTemplate={handleSaveAsTemplate}
                  onBreakdown={handleBreakdownTask}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description="You have no upcoming tasks. Time to add new ones or enjoy your free time."
              actionLabel="Add Task"
              onAction={() => setShowTaskModal(true)}
            />
          )}
        </div>

        {/* AI Insights Feed */}
        {insights && insights.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Suggestions
            </h2>
            <div className="space-y-3">
              {insights.map((insight) => (
                <Card key={insight.id} className="p-4 border-l-4 border-l-primary" data-testid={`card-insight-${insight.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <TaskCreationModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        onSubmit={handleCreateTask}
      />

      <SaveTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={taskToSave}
        onSave={handleSaveTemplate}
      />

      <BulkImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      <ReorganizeSwipe
        open={showReorganizeDrawer}
        onOpenChange={setShowReorganizeDrawer}
        tasks={upcomingTasks}
      />
    </>
  );
}
