import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { insertTaskSchema, type InsertTask, type Project } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Sparkles, Loader2, Repeat } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface TaskCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertTask) => Promise<void>;
  initialTask?: any;
}

export function TaskCreationModal({
  open,
  onOpenChange,
  onSubmit,
  initialTask,
}: TaskCreationModalProps) {
  const [isAIParsing, setIsAIParsing] = useState(false);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      dueDate: undefined,
      deadlineDateTime: undefined,
      projectId: undefined,
      isAISuggested: false,
      aiCategory: undefined,
      isRecurring: false,
      recurrencePattern: undefined,
      recurrenceInterval: "1",
      recurrenceEndDate: undefined,
      recurrenceEndCount: undefined,
    },
  });

  // Reset form when initialTask changes
  useEffect(() => {
    if (initialTask) {
      form.reset({
        title: initialTask.title || "",
        description: initialTask.description || "",
        priority: initialTask.priority || "medium",
        status: initialTask.status || "todo",
        dueDate: initialTask.dueDate ? new Date(initialTask.dueDate) : undefined,
        deadlineDateTime: initialTask.deadlineDateTime ? new Date(initialTask.deadlineDateTime) : undefined,
        projectId: initialTask.projectId || undefined,
        isAISuggested: initialTask.isAISuggested || false,
        aiCategory: initialTask.aiCategory || undefined,
        isRecurring: initialTask.isRecurring || false,
        recurrencePattern: initialTask.recurrencePattern || undefined,
        recurrenceInterval: initialTask.recurrenceInterval || "1",
        recurrenceEndDate: initialTask.recurrenceEndDate ? new Date(initialTask.recurrenceEndDate) : undefined,
        recurrenceEndCount: initialTask.recurrenceEndCount || undefined,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: undefined,
        deadlineDateTime: undefined,
        projectId: undefined,
        isAISuggested: false,
        aiCategory: undefined,
        isRecurring: false,
        recurrencePattern: undefined,
        recurrenceInterval: "1",
        recurrenceEndDate: undefined,
        recurrenceEndCount: undefined,
      });
    }
  }, [initialTask, form]);

  const handleSubmit = async (data: InsertTask) => {
    await onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  // Watch isRecurring and clear dueDate when it's turned off
  const isRecurring = form.watch("isRecurring");
  useEffect(() => {
    if (!isRecurring) {
      form.setValue("dueDate", undefined);
    }
  }, [isRecurring, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-create-task">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialTask ? "Edit Task" : "Create New Task"}
            {isAIParsing && (
              <span className="flex items-center gap-1 text-sm font-normal text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI analyzing...
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {initialTask ? "Update task details and settings" : "Add a new task with details and AI-powered suggestions"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What needs to be done?"
                      {...field}
                      data-testid="input-task-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add more details about this task..."
                      className="resize-none min-h-20"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task-project">
                          <SelectValue placeholder="No project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No project</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Due Date{isRecurring && <span className="text-destructive"> *</span>}
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-select-due-date"
                            disabled={!isRecurring}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>{isRecurring ? "Pick a date" : "Enable recurring task first"}</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {isRecurring ? (
                      !field.value && (
                        <p className="text-xs text-muted-foreground">
                          Required for recurring tasks
                        </p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Due date is only available for recurring tasks
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deadlineDateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline (Date & Time)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? new Date(value) : null);
                      }}
                      data-testid="input-deadline-datetime"
                      className="w-full"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Optional: Set a specific deadline with time
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-primary" />
                      Recurring Task
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Automatically create this task on a schedule
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-recurring"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isRecurring") && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="recurrencePattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-recurrence-pattern">
                              <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrenceInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Every</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            {...field}
                            data-testid="input-recurrence-interval"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="recurrenceEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-select-recurrence-end-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Never</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI will automatically categorize and suggest improvements for your task</span>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-task"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                data-testid="button-submit-task"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
