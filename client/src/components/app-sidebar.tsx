import {
  Calendar,
  LayoutDashboard,
  ListTodo,
  FolderKanban,
  Sparkles,
  Archive,
  Plus,
  FileCode2,
  CalendarClock,
  Settings as SettingsIcon,
  Shield,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

const navigationItems = [
  {
    key: "dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    key: "today",
    url: "/today",
    icon: ListTodo,
  },
  {
    key: "upcoming",
    url: "/upcoming",
    icon: Calendar,
  },
  {
    key: "projects",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    key: "insights",
    url: "/insights",
    icon: Sparkles,
  },
  {
    key: "dayPlanner",
    url: "/day-plan",
    icon: CalendarClock,
  },
  {
    key: "templates",
    url: "/templates",
    icon: FileCode2,
  },
  {
    key: "archive",
    url: "/archive",
    icon: Archive,
  },
  {
    key: "settings",
    url: "/settings",
    icon: SettingsIcon,
  },
];

interface AppSidebarProps {
  onQuickAdd?: () => void;
}

export function AppSidebar({ onQuickAdd }: AppSidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{t('app.name')}</span>
            <span className="text-xs text-muted-foreground">{t('app.tagline')}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <div className="px-2 pb-2">
            <Button
              className="w-full justify-start gap-2"
              size="default"
              onClick={onQuickAdd}
              data-testid="button-quick-add-task"
            >
              <Plus className="h-4 w-4" />
              {t('tasks.quickAdd')}
            </Button>
          </div>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.dashboard')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-sidebar-${item.key}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(`nav.${item.key}`)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {user?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin"}
                    data-testid="link-sidebar-admin"
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>{t('nav.admin')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-2 px-2">
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.email || "User"}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user.email?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.isAdmin
                  ? "Admin"
                  : "User"}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => window.location.href = "/api/logout"}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          {t('auth.logOut')}
        </Button>
        <div className="rounded-lg bg-sidebar-accent p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>AI-powered insights active</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
