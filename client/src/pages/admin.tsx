import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Shield, Users, CheckCircle2, XCircle, Database, Trash2, RefreshCw, AlertCircle } from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const { user: currentUser, isLoading: authLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [currentUser, authLoading, toast]);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && currentUser && !currentUser.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [currentUser, authLoading, toast]);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!currentUser?.isAdmin,
  });

  // Cache monitoring
  const { data: cacheStats, isLoading: cacheLoading } = useQuery({
    queryKey: ["/api/admin/cache/stats"],
    enabled: !!currentUser?.isAdmin,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const clearCacheMutation = useMutation({
    mutationFn: async (namespace?: string) => {
      return await apiRequest("POST", "/api/admin/cache/clear", { namespace });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cache/stats"] });
      toast({
        title: "Cache cleared",
        description: response.message || "Cache has been cleared successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    },
  });

  const pruneCacheMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/cache/prune", {});
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cache/stats"] });
      toast({
        title: "Cache pruned",
        description: response.message || "Expired cache entries removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to prune cache. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, isAdmin, hasAIAccess }: { userId: string; isAdmin: boolean; hasAIAccess: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}`, { isAdmin, hasAIAccess });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User permissions have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user permissions. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || !currentUser || !currentUser.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage user access levels and permissions
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              View and manage all registered users and their access levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <Card key={user.id} className="hover-elevate">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {user.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt={user.email || "User"}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold">
                                {user.email?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium" data-testid={`text-user-email-${user.id}`}>
                                {user.email || "No email"}
                              </span>
                              {user.id === currentUser.id && (
                                <Badge variant="secondary">You</Badge>
                              )}
                            </div>
                            {(user.firstName || user.lastName) && (
                              <p className="text-sm text-muted-foreground">
                                {user.firstName} {user.lastName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {user.isAdmin ? (
                                <Badge variant="default" className="gap-1">
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </Badge>
                              ) : null}
                              {user.hasAIAccess ? (
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  AI Access
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  No AI Access
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label htmlFor={`admin-${user.id}`} className="text-sm font-medium">
                              Admin Access
                            </Label>
                            <Switch
                              id={`admin-${user.id}`}
                              checked={user.isAdmin}
                              disabled={user.id === currentUser.id || updateRoleMutation.isPending}
                              onCheckedChange={(checked) => {
                                updateRoleMutation.mutate({
                                  userId: user.id,
                                  isAdmin: checked,
                                  hasAIAccess: user.hasAIAccess,
                                });
                              }}
                              data-testid={`switch-admin-${user.id}`}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <Label htmlFor={`ai-${user.id}`} className="text-sm font-medium">
                              AI Features
                            </Label>
                            <Switch
                              id={`ai-${user.id}`}
                              checked={user.hasAIAccess}
                              disabled={updateRoleMutation.isPending}
                              onCheckedChange={(checked) => {
                                updateRoleMutation.mutate({
                                  userId: user.id,
                                  isAdmin: user.isAdmin,
                                  hasAIAccess: checked,
                                });
                              }}
                              data-testid={`switch-ai-${user.id}`}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Monitoring
            </CardTitle>
            <CardDescription>
              Monitor cache usage and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cacheLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading cache stats...
              </div>
            ) : !cacheStats ? (
              <div className="text-center py-8 text-muted-foreground">
                Unable to load cache statistics
              </div>
            ) : (
              <div className="space-y-6">
                {/* Health Status */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    {cacheStats.health.status === 'healthy' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : cacheStats.health.status === 'warning' ? (
                      <AlertCircle className="h-6 w-6 text-yellow-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        Cache Health: {cacheStats.health.status.charAt(0).toUpperCase() + cacheStats.health.status.slice(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {cacheStats.health.message}
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      cacheStats.health.status === 'healthy' ? 'default' : 
                      cacheStats.health.status === 'warning' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {cacheStats.health.utilizationPercent.toFixed(1)}% Used
                  </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="text-sm text-muted-foreground mb-1">Keys</div>
                    <div className="text-2xl font-bold">
                      {cacheStats.memory.keyCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {cacheStats.memory.maxKeys.toLocaleString()} max
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-card">
                    <div className="text-sm text-muted-foreground mb-1">Hit Rate</div>
                    <div className="text-2xl font-bold">
                      {(cacheStats.memory.hitRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {cacheStats.memory.hits.toLocaleString()} hits
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-card">
                    <div className="text-sm text-muted-foreground mb-1">Misses</div>
                    <div className="text-2xl font-bold">
                      {cacheStats.memory.misses.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      cache misses
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-card">
                    <div className="text-sm text-muted-foreground mb-1">Value Size</div>
                    <div className="text-2xl font-bold">
                      {cacheStats.memory.vsize.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      bytes stored
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/cache/stats"] })}
                    className="gap-2"
                    data-testid="button-refresh-cache-stats"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Stats
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pruneCacheMutation.mutate()}
                    disabled={pruneCacheMutation.isPending}
                    className="gap-2"
                    data-testid="button-prune-cache"
                  >
                    <Database className="h-4 w-4" />
                    Prune Expired
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Clear data cache? This will invalidate all cached tasks, projects, and insights.")) {
                        clearCacheMutation.mutate("data");
                      }
                    }}
                    disabled={clearCacheMutation.isPending}
                    className="gap-2"
                    data-testid="button-clear-data-cache"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Data Cache
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Clear ALL cache? This will clear all cached data including AI results. Are you sure?")) {
                        clearCacheMutation.mutate();
                      }
                    }}
                    disabled={clearCacheMutation.isPending}
                    className="gap-2"
                    data-testid="button-clear-all-cache"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All Cache
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
