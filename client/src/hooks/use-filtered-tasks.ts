import { useQuery } from "@tanstack/react-query";
import { useFilters } from "@/contexts/filter-context";
import type { Task } from "@shared/schema";

export function useFilteredTasks() {
  const { search, priority, status, projectId } = useFilters();

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (priority && priority !== "all") queryParams.set("priority", priority);
  if (status && status !== "all") queryParams.set("status", status);
  if (projectId && projectId !== "all") queryParams.set("projectId", projectId);

  const queryString = queryParams.toString();
  const endpoint = `/api/tasks${queryString ? `?${queryString}` : ""}`;

  return useQuery<Task[]>({
    queryKey: ["/api/tasks", { search, priority, status, projectId }],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return response.json();
    },
  });
}
