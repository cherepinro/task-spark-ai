import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        
        // Handle Zod validation errors (array format)
        if (errorData.error && Array.isArray(errorData.error)) {
          const messages = errorData.error.map((err: any) => err.message).join(", ");
          errorMessage = messages || "Validation error";
        }
        // Handle simple error message (string format)
        else if (errorData.error && typeof errorData.error === "string") {
          errorMessage = errorData.error;
        }
        // Handle error with message property
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else {
        errorMessage = (await res.text()) || res.statusText;
      }
    } catch (e) {
      // If parsing fails, use status text
      errorMessage = res.statusText;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds - balance between performance and data freshness
      refetchOnMount: true, // Always refetch when component mounts to ensure fresh data
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
