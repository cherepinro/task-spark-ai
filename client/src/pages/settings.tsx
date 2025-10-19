import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSettings } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const res = await apiRequest("PATCH", "/api/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your TaskSpark AI preferences and features.
          </p>
        </div>

        <div className="space-y-4">
          {/* Focus Sprint Settings */}
          <Card data-testid="card-focus-sprint-settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Focus Sprint
              </CardTitle>
              <CardDescription>
                Neuro-inclusive 10-minute focus sessions with stim sounds and progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="focus-sprint-enabled" className="text-base">
                    Enable Focus Sprint
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show "Start 10-min sprint" button on Today page
                  </p>
                </div>
                <Switch
                  id="focus-sprint-enabled"
                  checked={settings?.focusSprintEnabled || false}
                  onCheckedChange={(checked) => {
                    updateSettings.mutate({ focusSprintEnabled: checked });
                  }}
                  data-testid="switch-focus-sprint-enabled"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label htmlFor="focus-sprint-sound" className="text-base">
                  Stim Sound
                </Label>
                <p className="text-sm text-muted-foreground">
                  Choose a background sound for your focus sessions
                </p>
                <Select
                  value={settings?.focusSprintSound || "soft-chime"}
                  onValueChange={(value) => {
                    updateSettings.mutate({ 
                      focusSprintSound: value as "soft-chime" | "white-noise" | "nature-sounds"
                    });
                  }}
                  disabled={!settings?.focusSprintEnabled}
                >
                  <SelectTrigger 
                    id="focus-sprint-sound" 
                    className="w-full"
                    data-testid="select-focus-sprint-sound"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft-chime">Soft Chime</SelectItem>
                    <SelectItem value="white-noise">White Noise</SelectItem>
                    <SelectItem value="nature-sounds">Nature Sounds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
