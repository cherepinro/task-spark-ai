import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Zap, Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSettings, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();

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

  const updateUserPreferences = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const res = await apiRequest("PATCH", "/api/auth/user", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Preferences updated",
        description: "Your account preferences have been saved.",
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
          {/* Push Notifications Settings */}
          <Card data-testid="card-push-notifications-settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Control task reminders and push notifications on your devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="push-notifications-enabled" className="text-base">
                    Enable Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive reminders for tasks due soon and high-priority items
                  </p>
                </div>
                <Switch
                  id="push-notifications-enabled"
                  checked={user?.pushNotificationsEnabled || false}
                  onCheckedChange={(checked) => {
                    updateUserPreferences.mutate({ pushNotificationsEnabled: checked });
                  }}
                  data-testid="switch-push-notifications-enabled"
                />
              </div>
            </CardContent>
          </Card>

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
