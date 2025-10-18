import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  FolderKanban,
  Sparkles,
  Archive,
  Plus,
  Search,
} from "lucide-react";
import { useLocation } from "wouter";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const commands = [
  {
    group: "Navigation",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", action: "/" },
      { icon: ListTodo, label: "Today", action: "/today" },
      { icon: Calendar, label: "Upcoming", action: "/upcoming" },
      { icon: FolderKanban, label: "Projects", action: "/projects" },
      { icon: Sparkles, label: "AI Insights", action: "/insights" },
      { icon: Archive, label: "Archive", action: "/archive" },
    ],
  },
  {
    group: "Actions",
    items: [
      { icon: Plus, label: "Create New Task", action: "create-task" },
      { icon: Plus, label: "Create New Project", action: "create-project" },
      { icon: Sparkles, label: "Open AI Chat", action: "ai-chat" },
    ],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (action: string) => {
    if (action.startsWith("/")) {
      setLocation(action);
    } else {
      // Handle other actions
      console.log("Action:", action);
    }
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." data-testid="input-command-palette" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => (
              <CommandItem
                key={item.action}
                onSelect={() => handleSelect(item.action)}
                data-testid={`command-${item.action}`}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
