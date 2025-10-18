import { useQuery } from "@tanstack/react-query";
import { type AIInsight } from "@shared/schema";
import { EmptyState } from "@/components/empty-state";
import { TaskCardSkeleton } from "@/components/loading-state";
import { Sparkles, TrendingUp, Brain, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default function Insights() {
  const { data: insights, isLoading } = useQuery<AIInsight[]>({
    queryKey: ["/api/insights"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <TaskCardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Intelligent productivity analysis and recommendations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Smart Categorization</p>
              <p className="text-lg font-semibold">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-3/20">
              <TrendingUp className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Productivity Score</p>
              <p className="text-lg font-semibold">8.5/10</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-4/20">
              <Target className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tasks Analyzed</p>
              <p className="text-lg font-semibold">127</p>
            </div>
          </div>
        </Card>
      </div>

      {insights && insights.length > 0 ? (
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="p-6 border-l-4 border-l-primary" data-testid={`card-insight-${insight.id}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-semibold">{insight.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(insight.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No insights yet"
          description="AI will analyze your tasks and provide intelligent recommendations as you use the app."
        />
      )}
    </div>
  );
}
