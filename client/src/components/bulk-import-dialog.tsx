import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import { ListChecks } from "lucide-react";

const bulkImportSchema = z.object({
  checklist: z.string().min(1, "Checklist is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  projectId: z.string().optional(),
});

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const { toast } = useToast();
  const [taskCount, setTaskCount] = useState(0);

  const form = useForm<z.infer<typeof bulkImportSchema>>({
    resolver: zodResolver(bulkImportSchema),
    defaultValues: {
      checklist: "",
      priority: "medium",
      projectId: undefined,
    },
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const importMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bulkImportSchema>) => {
      const response = await apiRequest("POST", "/api/tasks/bulk-import", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Tasks imported successfully! ✓",
        description: `Created ${data.count} task${data.count !== 1 ? "s" : ""} from checklist`,
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import tasks",
        variant: "destructive",
      });
    },
  });

  const handleChecklistChange = (value: string) => {
    const lines = value.trim().split("\n");
    const validTasks = lines.filter((line) =>
      line.match(/^-\s*\[[\sx]\]\s*(.+?)(?:\s*\((\d+(?:\.\d+)?)h\))?$/i)
    );
    setTaskCount(validTasks.length);
  };

  const handleSubmit = (data: z.infer<typeof bulkImportSchema>) => {
    importMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-bulk-import">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Import from Checklist
          </DialogTitle>
          <DialogDescription>
            Paste a markdown checklist to create multiple tasks at once. Format:
            <code className="block mt-2 p-2 bg-muted rounded text-xs">
              - [ ] Task name (optional hours)
            </code>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="checklist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Checklist</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`- [ ] Design wireframes (4h)\n- [ ] Setup backend API (8h)\n- [ ] Write tests (3h)`}
                      className="font-mono text-sm min-h-[200px]"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleChecklistChange(e.target.value);
                      }}
                      data-testid="textarea-checklist"
                    />
                  </FormControl>
                  <FormDescription>
                    {taskCount > 0 ? (
                      <span className="text-primary font-medium">
                        {taskCount} task{taskCount !== 1 ? "s" : ""} detected
                      </span>
                    ) : (
                      "Use format: - [ ] Task name (hours)"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
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
                    <FormLabel>Project (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="No project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setTaskCount(0);
                  onOpenChange(false);
                }}
                data-testid="button-cancel-import"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={importMutation.isPending || taskCount === 0}
                data-testid="button-import-tasks"
              >
                {importMutation.isPending
                  ? "Importing..."
                  : `Import ${taskCount} Task${taskCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
