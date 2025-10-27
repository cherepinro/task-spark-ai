import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Send, RotateCcw, Mic, MicOff } from "lucide-react";
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
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguage] = useState<'ru-RU' | 'en-US'>('ru-RU');
  const recognitionRef = useRef<any>(null);
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

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message || "Sorry, I didn't get a response.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // If AI suggested a task, create it
      if (response.taskSuggestion) {
        try {
          const taskPayload: any = {
            title: response.taskSuggestion.title,
            description: response.taskSuggestion.description,
            priority: response.taskSuggestion.priority,
            status: "todo",
          };
          
          // Include projectId if present
          if (response.taskSuggestion.projectId) {
            taskPayload.projectId = response.taskSuggestion.projectId;
          }
          
          const taskRes = await apiRequest("POST", "/api/tasks", taskPayload);

          if (!taskRes.ok) {
            const errorData = await taskRes.json();
            throw new Error(errorData.error || "Failed to create task");
          }

          await taskRes.json();

          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

          toast({
            title: "Задача создана!",
            description: `Создано: ${response.taskSuggestion.title}`,
          });
        } catch (error) {
          toast({
            title: "Ошибка",
            description: "Не удалось создать задачу. Попробуйте вручную.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
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
    // Directly trigger the send instead of using setTimeout to avoid memory leaks
    // Use a microtask to ensure input is set before sending
    queueMicrotask(() => {
      handleSend();
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    toast({
      title: "Новый чат",
      description: "История чата очищена. Начните новый разговор!",
    });
  };

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      
      // Create task directly from voice input
      const createTaskFromVoice = async () => {
        try {
          const taskPayload = {
            title: transcript,
            status: "todo",
            priority: "medium",
          };

          const taskRes = await apiRequest("POST", "/api/tasks", taskPayload);

          if (!taskRes.ok) {
            const errorData = await taskRes.json();
            throw new Error(errorData.error || "Failed to create task");
          }

          await taskRes.json();
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

          toast({
            title: "✅ Задача создана голосом!",
            description: `"${transcript}"`,
          });

          setInput("");
        } catch (error) {
          toast({
            title: "Ошибка",
            description: "Не удалось создать задачу. Попробуйте снова.",
            variant: "destructive",
          });
        } finally {
          setIsRecording(false);
        }
      };

      createTaskFromVoice();
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({
          title: "Ошибка распознавания",
          description: "Не удалось распознать речь. Попробуйте снова.",
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, toast]);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Не поддерживается",
        description: "Ваш браузер не поддерживает распознавание речи. Попробуйте Chrome или Edge.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "🎤 Слушаю...",
        description: language === 'ru-RU' ? "Говорите по-русски" : "Speak in English",
      });
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'ru-RU' ? 'en-US' : 'ru-RU';
    setLanguage(newLang);
    toast({
      title: "Язык изменен",
      description: newLang === 'ru-RU' ? "Русский язык" : "English language",
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

        <div className="p-4 border-t space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder={isRecording ? "Слушаю..." : "Спросите ИИ что-нибудь..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading || isRecording}
              data-testid="input-ai-chat"
            />
            <Button
              size="icon"
              onClick={toggleVoiceRecognition}
              disabled={isLoading}
              variant={isRecording ? "destructive" : "outline"}
              data-testid="button-voice-input"
              title={isRecording ? "Остановить запись" : "Голосовой ввод"}
            >
              {isRecording ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-xs h-6"
              data-testid="button-toggle-language"
            >
              🌐 {language === 'ru-RU' ? 'Русский' : 'English'}
            </Button>
            {isRecording && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Говорите название задачи...
              </span>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
