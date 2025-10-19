import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface ProcrastinationScoreResponse {
  score: number;
  level: string;
  confidence: number;
  calculatedAt: string;
  fromCache?: boolean;
  fallback?: boolean;
  error?: string;
}

export function ProcrastinationScore() {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery<ProcrastinationScoreResponse>({
    queryKey: ['/api/ml/procrastination-score'],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000, // 1 hour - matches server cache
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1" data-testid="badge-procrastination-loading">
        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
        <span className="text-xs">Calculating...</span>
      </Badge>
    );
  }

  if (!data) {
    return null;
  }

  // Determine color based on level
  const getScoreColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'moderate':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'high':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getIcon = () => {
    switch (data.level) {
      case 'low':
        return <TrendingDown className="h-3 w-3" />;
      case 'moderate':
        return <Minus className="h-3 w-3" />;
      case 'high':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTips = (level: string) => {
    switch (level) {
      case 'low':
        return {
          title: "Excellent Task Management! 🎉",
          description: "You're staying on top of your tasks with minimal procrastination.",
          tips: [
            "Keep maintaining your current momentum",
            "Consider helping team members who might be struggling",
            "Document your workflow to replicate success",
            "Take time to celebrate your wins"
          ]
        };
      case 'moderate':
        return {
          title: "Room for Improvement 💪",
          description: "You're doing okay, but there are opportunities to optimize your workflow.",
          tips: [
            "Break down complex tasks into smaller, manageable pieces (try AI Task Decompose)",
            "Use AI Day Planner to optimize your daily schedule",
            "Review and update task priorities regularly",
            "Set realistic deadlines and stick to them",
            "Try the Focus Sprint feature for concentrated work sessions"
          ]
        };
      case 'high':
        return {
          title: "Take Action Now! 🚨",
          description: "Significant procrastination detected. Let's get you back on track.",
          tips: [
            "Start with the smallest task to build momentum",
            "Use the Eisenhower Matrix (AI Reorganize) to prioritize effectively",
            "Schedule AI Day Planning to structure your day",
            "Set up Focus Sprint sessions (10min work, 2min break)",
            "Review overdue tasks and reschedule or delegate",
            "Consider using task templates for recurring work",
            "Chat with AI assistant for personalized productivity advice"
          ]
        };
      default:
        return {
          title: "Procrastination Insights",
          description: "Learn about your task management patterns.",
          tips: []
        };
    }
  };

  const tips = getTips(data.level);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Badge
          variant="outline"
          className={`gap-1.5 cursor-pointer hover-elevate active-elevate-2 transition-all ${getScoreColor(data.level)}`}
          data-testid="badge-procrastination-score"
        >
          {getIcon()}
          <span className="text-xs font-medium">Score: {data.score}</span>
          <Info className="h-3 w-3 opacity-60" />
        </Badge>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto" data-testid="sheet-procrastination-tips">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">{tips.title}</SheetTitle>
          <SheetDescription className="text-sm">
            {tips.description}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Score Details */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="text-sm font-medium">Procrastination Score</p>
              <p className="text-2xl font-bold" data-testid="text-score-value">{data.score}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Level: {data.level} • Confidence: {Math.round(data.confidence * 100)}%
              </p>
            </div>
            <div className={`p-4 rounded-full ${getScoreColor(data.level)}`}>
              {getIcon()}
            </div>
          </div>

          {/* Tips */}
          {tips.tips.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Recommendations</h3>
              <ul className="space-y-2">
                {tips.tips.map((tip, index) => (
                  <li key={index} className="flex gap-2 text-sm" data-testid={`text-tip-${index}`}>
                    <span className="text-primary font-medium shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ML Model Info */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              Calculated: {new Date(data.calculatedAt).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Score based on 10 behavioral features including task completion rate, 
              overdue tasks, priority distribution, and task age.
            </p>
            {data.fallback && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ Using fallback calculation (ML service unavailable)
              </p>
            )}
            {data.fromCache && (
              <p className="text-xs text-muted-foreground">
                ⚡ Cached result (updates hourly)
              </p>
            )}
          </div>

          {/* Action Button */}
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full"
            data-testid="button-close-tips"
          >
            Got it!
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
