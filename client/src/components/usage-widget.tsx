import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  ListChecks, 
  MessageSquare, 
  ListTodo, 
  FolderKanban,
  CalendarClock,
  AlertTriangle,
  ArrowDownUp
} from "lucide-react";

interface UsageCheck {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  feature: string;
}

interface UsageData {
  ai_decompose: UsageCheck;
  bulk_import: UsageCheck;
  ai_chat: UsageCheck;
  day_plan: UsageCheck;
  ai_reorganize: UsageCheck;
  tasks: UsageCheck;
  projects: UsageCheck;
}

const FEATURE_ICONS = {
  ai_decompose: Zap,
  bulk_import: ListChecks,
  ai_chat: MessageSquare,
  day_plan: CalendarClock,
  ai_reorganize: ArrowDownUp,
  tasks: ListTodo,
  projects: FolderKanban,
};

const FEATURE_COLORS = {
  ai_decompose: "text-primary",
  bulk_import: "text-chart-2",
  ai_chat: "text-chart-4",
  day_plan: "text-chart-1",
  ai_reorganize: "text-primary",
  tasks: "text-chart-3",
  projects: "text-chart-5",
};

export function UsageWidget() {
  const { data: usage, isLoading } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="p-4" data-testid="card-usage-loading">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-2 bg-muted rounded"></div>
          <div className="h-2 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!usage) return null;

  const usageEntries = Object.entries(usage) as [keyof UsageData, UsageCheck][];
  const hasWarnings = usageEntries.some(
    ([, data]) => data.remaining <= data.limit * 0.2
  );

  return (
    <Card className="p-4" data-testid="card-usage-widget">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Usage Limits</h3>
        {hasWarnings && (
          <Badge variant="outline" className="gap-1 text-chart-4">
            <AlertTriangle className="h-3 w-3" />
            Low quota
          </Badge>
        )}
      </div>
      <div className="space-y-3">
        {usageEntries.map(([key, data]) => {
          const Icon = FEATURE_ICONS[key];
          const colorClass = FEATURE_COLORS[key];
          const percentage = (data.used / data.limit) * 100;
          const isLow = data.remaining <= data.limit * 0.2;

          return (
            <div key={key} className="space-y-1.5" data-testid={`usage-${key}`}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
                  <span className="font-medium">{data.feature}</span>
                </div>
                <span className={`text-xs ${isLow ? 'text-chart-4 font-medium' : 'text-muted-foreground'}`}>
                  {data.used} / {data.limit}
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-1.5" 
                data-testid={`progress-${key}`}
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Monthly limits reset on the 1st of each month
      </p>
    </Card>
  );
}
