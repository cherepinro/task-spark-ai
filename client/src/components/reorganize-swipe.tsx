import { useState, useRef, useMemo } from "react";
import TinderCard from "react-tinder-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { ArrowLeft, ArrowRight, Calendar, Sparkles, Trash2, Users, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@shared/schema";

interface ReorganizeSuggestion {
  id: string;
  action: "defer" | "delete" | "delegate";
  reason: string;
}

interface ReorganizeSwipeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
}

const actionConfig = {
  defer: {
    label: "Defer",
    icon: Calendar,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description: "Schedule for later",
  },
  delete: {
    label: "Delete",
    icon: Trash2,
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    description: "Remove from list",
  },
  delegate: {
    label: "Delegate",
    icon: Users,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description: "Deprioritize or delegate",
  },
};

export function ReorganizeSwipe({ open, onOpenChange, tasks }: ReorganizeSwipeProps) {
  const [suggestions, setSuggestions] = useState<ReorganizeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [completedRatio, setCompletedRatio] = useState(0);
  const { toast } = useToast();
  const childRefs = useRef<any[]>([]);

  const fetchSuggestions = async () => {
    if (tasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select some tasks to reorganize.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai/reorganize", {
        taskIds: tasks.map(t => t.id),
      });
      const data = await res.json();
      
      setSuggestions(data.suggestions || []);
      setCompletedRatio(data.completedRatio7d || 0);
      setCurrentIndex(data.suggestions?.length - 1 || 0);
      childRefs.current = Array(data.suggestions?.length || 0).fill(null).map(() => null);
      setAcceptedSuggestions(new Set());
      
      toast({
        title: "AI Analysis Complete",
        description: `${data.suggestions?.length || 0} suggestions generated using Eisenhower Matrix`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = (direction: string, suggestion: ReorganizeSuggestion) => {
    if (direction === "left") {
      // Accept suggestion
      setAcceptedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.id)));
    }
    // Right = skip (do nothing)
    setCurrentIndex(prev => prev - 1);
  };

  const canSwipe = currentIndex >= 0;

  const swipe = async (dir: "left" | "right") => {
    if (canSwipe && childRefs.current[currentIndex]) {
      await childRefs.current[currentIndex].swipe(dir);
    }
  };

  const handleApply = async () => {
    if (acceptedSuggestions.size === 0) {
      toast({
        title: "No changes to apply",
        description: "You haven't accepted any suggestions.",
      });
      return;
    }

    try {
      const updates = suggestions
        .filter(s => acceptedSuggestions.has(s.id))
        .map(s => {
          const update: any = { id: s.id, updates: {} };
          
          if (s.action === "defer") {
            // Defer: set due date to 7 days from now, lower priority
            const deferDate = new Date();
            deferDate.setDate(deferDate.getDate() + 7);
            update.updates.dueDate = deferDate;
            update.updates.priority = "low";
          } else if (s.action === "delete") {
            // Delete: archive the task
            update.updates.status = "archived";
          } else if (s.action === "delegate") {
            // Delegate: lower priority, mark as in-progress
            update.updates.priority = "low";
            update.updates.status = "in-progress";
          }
          
          return update;
        });

      await apiRequest("PATCH", "/api/tasks/bulk", { updates });
      
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      toast({
        title: "Tasks Reorganized",
        description: `Applied ${acceptedSuggestions.size} suggestion(s) successfully.`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to apply changes",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const currentSuggestion = suggestions[currentIndex];
  const taskForSuggestion = useMemo(() => 
    tasks.find(t => t.id === currentSuggestion?.id),
    [tasks, currentSuggestion]
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]" data-testid="drawer-reorganize">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2" data-testid="text-reorganize-title">
            <Sparkles className="h-5 w-5 text-primary" />
            Eisenhower Swipe
          </DrawerTitle>
          <DrawerDescription data-testid="text-reorganize-description">
            AI-powered task reorganization using the Eisenhower Matrix
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Your 7-day completion rate: <span className="font-semibold text-foreground">{Math.round(completedRatio * 100)}%</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {tasks.length} task(s) selected for analysis
                </p>
              </div>
              <Button 
                onClick={fetchSuggestions} 
                disabled={loading || tasks.length === 0}
                data-testid="button-analyze"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Analyzing..." : "Analyze Tasks"}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Card {suggestions.length - currentIndex} of {suggestions.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {acceptedSuggestions.size} accepted
                </div>
              </div>

              <div className="relative h-[400px] flex items-center justify-center mb-6">
                {suggestions.map((suggestion, index) => {
                  const task = tasks.find(t => t.id === suggestion.id);
                  const config = actionConfig[suggestion.action];
                  const Icon = config.icon;
                  
                  return (
                    <TinderCard
                      key={suggestion.id}
                      ref={(el) => (childRefs.current[index] = el)}
                      onSwipe={(dir) => handleSwipe(dir, suggestion)}
                      preventSwipe={["up", "down"]}
                      className="absolute"
                    >
                      <Card 
                        className="w-[350px] h-[360px] cursor-grab active:cursor-grabbing shadow-lg"
                        data-testid={`card-suggestion-${index}`}
                        style={{
                          display: index === currentIndex ? 'block' : 'none',
                        }}
                      >
                        <CardHeader className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg line-clamp-2" data-testid="text-task-title">
                              {task?.title || "Unknown task"}
                            </CardTitle>
                            <Badge variant="outline" className={config.color} data-testid="badge-action">
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <CardDescription data-testid="text-action-description">
                            {config.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Sparkles className="h-4 w-4" />
                              <span data-testid="text-ai-reason">{suggestion.reason}</span>
                            </div>
                            {task && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                                <div className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                </div>
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground text-center mb-4">
                              Swipe left to <strong className="text-foreground">accept</strong>, right to <strong className="text-foreground">skip</strong>
                            </p>
                            <div className="flex gap-4">
                              <Button
                                variant="outline"
                                onClick={() => swipe("right")}
                                disabled={!canSwipe}
                                className="flex-1"
                                data-testid="button-skip"
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Skip
                              </Button>
                              <Button
                                onClick={() => swipe("left")}
                                disabled={!canSwipe}
                                className="flex-1"
                                data-testid="button-accept"
                              >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TinderCard>
                  );
                })}

                {currentIndex < 0 && (
                  <div className="text-center space-y-4">
                    <p className="text-lg font-medium">All cards reviewed!</p>
                    <p className="text-sm text-muted-foreground">
                      {acceptedSuggestions.size} suggestion(s) accepted
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {suggestions.length > 0 && (
          <DrawerFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                onClick={handleApply} 
                disabled={acceptedSuggestions.size === 0}
                className="flex-1"
                data-testid="button-apply"
              >
                Apply Changes ({acceptedSuggestions.size})
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
