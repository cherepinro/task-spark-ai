import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { TaskCreationModal } from "@/components/task-creation-modal";
import { AIChatPanel } from "@/components/ai-chat-panel";
import { CommandPalette } from "@/components/command-palette";
import { TaskSearchFilter } from "@/components/task-search-filter";
import { FilterProvider, useFilters } from "@/contexts/filter-context";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import Today from "@/pages/today";
import Upcoming from "@/pages/upcoming";
import Projects from "@/pages/projects";
import Insights from "@/pages/insights";
import Templates from "@/pages/templates";
import Archive from "@/pages/archive";
import DayPlan from "@/pages/day-plan";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { InsertTask } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/today" component={Today} />
      <Route path="/upcoming" component={Upcoming} />
      <Route path="/projects" component={Projects} />
      <Route path="/insights" component={Insights} />
      <Route path="/day-plan" component={DayPlan} />
      <Route path="/templates" component={Templates} />
      <Route path="/archive" component={Archive} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { toast } = useToast();
  const filters = useFilters();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = async (data: InsertTask) => {
    await createTaskMutation.mutateAsync(data);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar onQuickAdd={() => setShowTaskModal(true)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="text-xs text-muted-foreground hidden lg:block">
                Press <kbd className="px-1.5 py-0.5 text-xs rounded bg-muted border">⌘K</kbd> for commands
              </div>
            </div>

            <TaskSearchFilter
              search={filters.search}
              onSearchChange={filters.setSearch}
              priority={filters.priority}
              onPriorityChange={filters.setPriority}
              status={filters.status}
              onStatusChange={filters.setStatus}
              projectId={filters.projectId}
              onProjectIdChange={filters.setProjectId}
              onClearFilters={filters.clearFilters}
            />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIChat(true)}
                data-testid="button-open-ai-chat"
                className="rounded-lg"
              >
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="sr-only">Open AI Chat</span>
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>

      <TaskCreationModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        onSubmit={handleCreateTask}
      />

      <AIChatPanel open={showAIChat} onOpenChange={setShowAIChat} />

      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
      />

      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <FilterProvider>
            <AppContent />
          </FilterProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
