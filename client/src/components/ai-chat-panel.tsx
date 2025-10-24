import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const suggestedPrompts = [
  "Show me my most important tasks",
  "What should I focus on today?",
  "Suggest a priority for this task",
  "Help me break down a project",
];

export function AIChatPanel({ open, onOpenChange }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest("POST", "/api/ai/chat", {
        message: messageToSend,
        conversationHistory,
      });
      const response = await res.json();

      console.log("[AI Chat] Response received:", {
        hasMessage: !!response.message,
        hasTaskSuggestion: !!response.taskSuggestion,
        taskSuggestion: response.taskSuggestion,
        fullResponse: response,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message || "Sorry, I didn't get a response.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // If AI suggested a task, create it
      if (response.taskSuggestion) {
        console.log("[AI Chat] Creating task from suggestion:", response.taskSuggestion);
        try {
          const taskRes = await apiRequest("POST", "/api/tasks", {
            title: response.taskSuggestion.title,
            description: response.taskSuggestion.description,
            priority: response.taskSuggestion.priority,
            status: "todo",
          });

          if (!taskRes.ok) {
            const errorData = await taskRes.json();
            console.error("[AI Chat] Task creation failed:", errorData);
            throw new Error(errorData.error || "Failed to create task");
          }

          const createdTask = await taskRes.json();
          console.log("[AI Chat] Task created successfully:", createdTask);

          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

          toast({
            title: "Задача создана!",
            description: `Создано: ${response.taskSuggestion.title}`,
          });
        } catch (error) {
          console.error("[AI Chat] Failed to create suggested task:", error);
          toast({
            title: "Ошибка",
            description: "Не удалось создать задачу. Попробуйте вручную.",
            variant: "destructive",
          });
        }
      } else {
        console.log("[AI Chat] No task suggestion in response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = async (prompt: string) => {
    setInput(prompt);
    // Auto-send the suggested prompt
    setTimeout(() => {
      const sendButton = document.querySelector('[data-testid="button-send-message"]') as HTMLButtonElement;
      if (sendButton) {
        sendButton.click();
      }
    }, 100);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    toast({
      title: "Новый чат",
      description: "История чата очищена. Начните новый разговор!",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-96 p-0 flex flex-col" data-testid="panel-ai-chat">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Assistant
            </SheetTitle>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                data-testid="button-new-chat"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Новый чат
              </Button>
            )}
          </div>
          <SheetDescription>
            Get intelligent help with your tasks
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ask me anything about your tasks. Try one of these:
              </p>
              <div className="space-y-2">
                {suggestedPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handlePromptClick(prompt)}
                    data-testid={`button-suggested-prompt-${index}`}
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <span className="text-sm">{prompt}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[80%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask AI anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
              data-testid="input-ai-chat"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
