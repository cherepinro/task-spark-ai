import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Calendar, Download, Sparkles, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TimeBlock {
  id: string;
  time: string;
  duration: number;
  taskId?: string;
  title: string;
  type: "task" | "habit" | "busy" | "free";
  description?: string;
}

export default function DayPlan() {
  const { toast } = useToast();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/day-plan", {
        tasks: selectedTasks,
        habits: [],
        busySlots: [],
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data: any) => {
      setTimeBlocks(data.timeBlocks);
      toast({
        title: "Day plan generated!",
        description: `Your schedule is ready with ${data.timeBlocks.length} time blocks.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleGeneratePlan = async () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to plan your day",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    await generatePlanMutation.mutateAsync();
    setIsGenerating(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(timeBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTimeBlocks(items);
  };

  const handleApplyPlan = async () => {
    // Update task dueDates based on time blocks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const block of timeBlocks) {
      if (block.taskId && block.type === "task") {
        const [hours, minutes] = block.time.split(':').map(Number);
        const dueDate = new Date(today);
        dueDate.setHours(hours, minutes, 0, 0);

        try {
          await apiRequest("PATCH", `/api/tasks/${block.taskId}`, {
            dueDate: dueDate.toISOString(),
          });
        } catch (error) {
          console.error(`Failed to update task ${block.taskId}:`, error);
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    
    toast({
      title: "Plan applied!",
      description: "Task due dates have been updated",
    });
  };

  const downloadICS = () => {
    const icsContent = generateICS(timeBlocks);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `day-plan-${new Date().toISOString().split('T')[0]}.ics`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Calendar downloaded",
      description: "ICS file ready to import into your calendar app",
    });
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const availableTasks = (tasks as any[])?.filter((t: any) => t.status !== "completed" && t.status !== "archived") || [];

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            AI Day Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Let AI organize your day with an optimized schedule
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          1 plan per day
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Task Selection */}
        <Card className="p-4 lg:col-span-1">
          <h2 className="font-semibold mb-3">Select Tasks</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks available</p>
            ) : (
              availableTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2 p-2 rounded hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => toggleTaskSelection(task.id)}
                  data-testid={`task-selector-${task.id}`}
                >
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => toggleTaskSelection(task.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.hours && (
                      <Badge variant="outline" className="gap-1 text-xs mt-1">
                        <Clock className="h-3 w-3" />
                        {task.hours}h
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <Button
            onClick={handleGeneratePlan}
            className="w-full mt-4 gap-2"
            disabled={isGenerating || selectedTasks.length === 0}
            data-testid="button-generate-plan"
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Day Plan
              </>
            )}
          </Button>
        </Card>

        {/* Timeline */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today's Schedule</h2>
            {timeBlocks.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={downloadICS}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-testid="button-download-ics"
                >
                  <Download className="h-4 w-4" />
                  Download ICS
                </Button>
                <Button
                  onClick={handleApplyPlan}
                  size="sm"
                  className="gap-2"
                  data-testid="button-apply-plan"
                >
                  Apply to Tasks
                </Button>
              </div>
            )}
          </div>

          {timeBlocks.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Select tasks and generate a plan to see your optimized schedule
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="timeline">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                    data-testid="timeline-droppable"
                  >
                    {timeBlocks.map((block, index) => (
                      <Draggable key={block.id} draggableId={block.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 rounded-lg border ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            } ${getBlockColor(block.type)}`}
                            data-testid={`time-block-${block.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm font-medium">
                                    {block.time}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {block.duration}min
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {block.type}
                                  </Badge>
                                </div>
                                <p className="font-medium">{block.title}</p>
                                {block.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {block.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Card>
      </div>
    </div>
  );
}

function getBlockColor(type: string): string {
  switch (type) {
    case "task":
      return "bg-primary/5 border-primary/20";
    case "habit":
      return "bg-chart-2/5 border-chart-2/20";
    case "busy":
      return "bg-chart-4/5 border-chart-4/20";
    case "free":
      return "bg-muted border-muted-foreground/20";
    default:
      return "bg-card";
  }
}

function generateICS(timeBlocks: TimeBlock[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = timeBlocks.map(block => {
    const [hours, minutes] = block.time.split(':').map(Number);
    const startDate = new Date(today);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + block.duration);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `BEGIN:VEVENT
UID:${block.id}@taskspark.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${block.title}
DESCRIPTION:${block.description || block.type}
STATUS:CONFIRMED
END:VEVENT`;
  }).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TaskSpark AI//Day Planner//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`;
}
