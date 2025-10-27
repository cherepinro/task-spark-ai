import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Calendar, Download, Sparkles, Clock, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

interface TimeBlock {
  id: string;
  time: string;
  duration: number;
  taskId?: string;
  title: string;
  type: "task" | "habit" | "busy" | "free";
  description?: string;
  priority?: string;
}

const STORAGE_KEY = 'taskspark-day-plan';

// Safe URL decoder that handles both encoded and non-encoded strings
function safeDecodeDescription(text: string): string {
  try {
    // Check if the string contains URL-encoded characters
    if (text.includes('%')) {
      return decodeURIComponent(text);
    }
    return text;
  } catch (error) {
    // If decoding fails, return original text
    return text;
  }
}

export default function DayPlan() {
  const { toast } = useToast();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Load persisted day plan on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const savedDate = parsed.date;
        const today = new Date().toDateString();
        
        if (savedDate === today && parsed.blocks) {
          setTimeBlocks(parsed.blocks);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to load saved day plan:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist day plan whenever it changes
  useEffect(() => {
    if (timeBlocks.length > 0) {
      const dataToSave = {
        date: new Date().toDateString(),
        blocks: timeBlocks,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [timeBlocks]);

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
      // Enrich time blocks with task priority information
      const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
      const enrichedBlocks = data.timeBlocks.map((block: TimeBlock) => ({
        ...block,
        priority: block.taskId ? taskMap.get(block.taskId)?.priority : undefined,
      }));
      
      setTimeBlocks(enrichedBlocks);
      toast({
        title: "День спланирован!",
        description: `Расписание готово с ${data.timeBlocks.length} временными блоками.`,
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
        title: "Не выбраны задачи",
        description: "Пожалуйста, выберите хотя бы одну задачу для планирования дня",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    await generatePlanMutation.mutateAsync();
    setIsGenerating(false);
  };

  const handleClearPlan = () => {
    setTimeBlocks([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "План очищен",
      description: "Расписание дня удалено",
    });
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
      title: "План применен!",
      description: "Даты выполнения задач обновлены",
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
      title: "Календарь загружен",
      description: "Файл ICS готов для импорта в календарь",
    });
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === availableTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(availableTasks.map((task: any) => task.id));
    }
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

  // Sort tasks by priority (high first) and deadline (earliest first)
  const availableTasks = (tasks || [])
    .filter((t: Task) => t.status !== "completed" && t.status !== "archived")
    .sort((a: Task, b: Task) => {
      // Priority order: high > medium > low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, sort by deadline (earliest first)
      if (a.deadlineDateTime && b.deadlineDateTime) {
        return new Date(a.deadlineDateTime).getTime() - new Date(b.deadlineDateTime).getTime();
      }
      if (a.deadlineDateTime) return -1;
      if (b.deadlineDateTime) return 1;
      
      return 0;
    });

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Планировщик дня с ИИ
          </h1>
          <p className="text-muted-foreground mt-1">
            Позвольте ИИ организовать ваш день с оптимизированным расписанием
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          5 планов в день
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Task Selection */}
        <Card className="p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Выбрать задачи</h2>
            {availableTasks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                data-testid="button-select-all"
              >
                {selectedTasks.length === availableTasks.length ? "Снять все" : "Выбрать все"}
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет доступных задач</p>
            ) : (
              availableTasks.map((task: Task) => (
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
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium flex-1">{task.title}</p>
                      {task.priority && (
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs h-5"
                        >
                          {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.hours && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {task.hours}ч
                        </Badge>
                      )}
                      {task.deadlineDateTime && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          {new Date(task.deadlineDateTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </Badge>
                      )}
                    </div>
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
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Создать план дня
              </>
            )}
          </Button>
        </Card>

        {/* Timeline */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Расписание дня</h2>
            {timeBlocks.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleClearPlan}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-testid="button-clear-plan"
                >
                  <Zap className="h-4 w-4" />
                  Очистить
                </Button>
                <Button
                  onClick={downloadICS}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-testid="button-download-ics"
                >
                  <Download className="h-4 w-4" />
                  Скачать ICS
                </Button>
                <Button
                  onClick={handleApplyPlan}
                  size="sm"
                  className="gap-2"
                  data-testid="button-apply-plan"
                >
                  Применить
                </Button>
              </div>
            )}
          </div>

          {timeBlocks.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Выберите задачи и создайте план, чтобы увидеть оптимизированное расписание
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="timeline">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-1.5"
                    data-testid="timeline-droppable"
                  >
                    {timeBlocks.map((block, index) => (
                      <Draggable key={block.id} draggableId={block.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-2 rounded border ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            } ${getBlockColor(block.type)}`}
                            data-testid={`time-block-${block.id}`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-mono text-xs font-medium whitespace-nowrap">
                                {block.time}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                                    {block.duration}м
                                  </Badge>
                                  {block.priority && (
                                    <span className="text-xs">
                                      {block.priority === 'high' ? '🔴' : block.priority === 'medium' ? '🟡' : '🟢'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium truncate">{block.title}</p>
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
