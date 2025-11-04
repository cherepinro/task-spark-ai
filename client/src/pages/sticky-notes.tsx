import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmptyState } from "@/components/empty-state";
import { StickyNote, Plus, Trash2, Mic, MicOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { StickyNote as StickyNoteType, InsertTask } from "@shared/schema";
import { useTranslation } from "react-i18next";

const COLORS = [
  { value: "yellow", bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-300 dark:border-yellow-700" },
  { value: "pink", bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-300 dark:border-pink-700" },
  { value: "blue", bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700" },
  { value: "green", bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-300 dark:border-green-700" },
  { value: "purple", bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700" },
  { value: "orange", bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-300 dark:border-orange-700" },
] as const;

export default function StickyNotes() {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteColor, setNewNoteColor] = useState<typeof COLORS[number]["value"]>("yellow");
  const [isListening, setIsListening] = useState(false);
  const [isListeningForNote, setIsListeningForNote] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const { data: notes, isLoading } = useQuery<StickyNoteType[]>({
    queryKey: ["/api/sticky-notes"],
  });

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        
        if (isListeningForNote) {
          setEditContent(prev => prev + (prev ? " " : "") + transcript);
        } else {
          setNewNoteContent(prev => prev + (prev ? " " : "") + transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsListeningForNote(null);
        toast({
          title: "Ошибка распознавания",
          description: "Не удалось распознать речь. Попробуйте снова.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsListeningForNote(null);
      };
    }
  }, [isListeningForNote, toast]);

  const createNoteMutation = useMutation({
    mutationFn: async (data: { content: string; color: string }) => {
      const maxPosition = notes?.reduce((max, note) => Math.max(max, note.position), -1) ?? -1;
      return await apiRequest("POST", "/api/sticky-notes", {
        content: data.content,
        color: data.color,
        position: maxPosition + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
      setNewNoteContent("");
      setNewNoteColor("yellow");
      toast({
        title: "Стикер создан",
        description: "Новый стикер успешно добавлен.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать стикер.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return await apiRequest("PATCH", `/api/sticky-notes/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
      setEditingNoteId(null);
      setEditContent("");
      toast({
        title: "Стикер обновлен",
        description: "Изменения сохранены.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить стикер.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/sticky-notes/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
      toast({
        title: "Стикер удален",
        description: "Стикер был удален.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить стикер.",
        variant: "destructive",
      });
    },
  });

  const convertToTaskMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const note = notes?.find(n => n.id === noteId);
      if (!note) throw new Error("Note not found");

      const taskData: Partial<InsertTask> = {
        title: note.content.slice(0, 100) || "Задача из стикера",
        description: note.content.length > 100 ? note.content : null,
        priority: "medium",
        status: "todo",
      };

      await apiRequest("POST", "/api/tasks", taskData);
      await apiRequest("DELETE", `/api/sticky-notes/${noteId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Преобразовано в задачу",
        description: "Стикер успешно преобразован в задачу.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось преобразовать стикер в задачу.",
        variant: "destructive",
      });
    },
  });

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст стикера.",
        variant: "destructive",
      });
      return;
    }
    await createNoteMutation.mutateAsync({ content: newNoteContent, color: newNoteColor });
  };

  const handleUpdateNote = async (id: string) => {
    if (!editContent.trim()) {
      toast({
        title: "Ошибка",
        description: "Текст стикера не может быть пустым.",
        variant: "destructive",
      });
      return;
    }
    await updateNoteMutation.mutateAsync({ id, content: editContent });
  };

  const handleDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      await deleteNoteMutation.mutateAsync(noteToDelete);
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const handleEditClick = (note: StickyNoteType) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const toggleVoiceInput = (noteId?: string) => {
    if (!recognitionRef.current) {
      toast({
        title: "Недоступно",
        description: "Голосовой ввод не поддерживается в вашем браузере.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsListeningForNote(null);
    } else {
      setIsListening(true);
      setIsListeningForNote(noteId || null);
      recognitionRef.current.start();
    }
  };

  const getColorClasses = (color: string) => {
    const colorObj = COLORS.find(c => c.value === color);
    return colorObj || COLORS[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-64 animate-pulse">
              <CardContent className="p-4">
                <div className="h-full bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <StickyNote className="h-6 w-6" />
          Стикеры
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Быстрые заметки с голосовым вводом
        </p>
      </div>

      {/* Create new sticky note */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold">Создать стикер</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Введите текст стикера или используйте голосовой ввод..."
                className="min-h-24"
                data-testid="input-new-note-content"
              />
              <Button
                size="icon"
                variant="ghost"
                className={`absolute bottom-2 right-2 ${isListening && !isListeningForNote ? 'bg-red-500 text-white' : ''}`}
                onClick={() => toggleVoiceInput()}
                data-testid="button-voice-new-note"
              >
                {isListening && !isListeningForNote ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Цвет:</span>
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewNoteColor(color.value as any)}
                  className={`w-8 h-8 rounded border-2 ${color.bg} ${
                    newNoteColor === color.value ? color.border : 'border-transparent'
                  } hover-elevate`}
                  data-testid={`button-color-${color.value}`}
                  aria-label={`Цвет ${color.value}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleCreateNote}
            disabled={createNoteMutation.isPending}
            data-testid="button-create-note"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать стикер
          </Button>
        </CardFooter>
      </Card>

      {/* Sticky notes grid */}
      {!notes || notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Нет стикеров"
          description="Создайте свой первый стикер для быстрых заметок"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note) => {
            const colorClasses = getColorClasses(note.color);
            const isEditing = editingNoteId === note.id;

            return (
              <Card
                key={note.id}
                className={`${colorClasses.bg} ${colorClasses.border} border-2 h-64 flex flex-col hover-elevate`}
                data-testid={`card-note-${note.id}`}
              >
                <CardContent className="p-4 flex-1 overflow-auto">
                  {isEditing ? (
                    <div className="relative h-full">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className={`h-full resize-none ${colorClasses.bg} border-none focus-visible:ring-0`}
                        data-testid={`input-edit-note-${note.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`absolute bottom-2 right-2 ${
                          isListening && isListeningForNote === note.id ? 'bg-red-500 text-white' : ''
                        }`}
                        onClick={() => toggleVoiceInput(note.id)}
                        data-testid={`button-voice-edit-${note.id}`}
                      >
                        {isListening && isListeningForNote === note.id ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p
                      className="text-sm whitespace-pre-wrap break-words cursor-pointer"
                      onClick={() => handleEditClick(note)}
                      data-testid={`text-note-content-${note.id}`}
                    >
                      {note.content || "Пустой стикер"}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="p-2 gap-1 flex-wrap">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={updateNoteMutation.isPending}
                        data-testid={`button-save-${note.id}`}
                      >
                        Сохранить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        data-testid={`button-cancel-${note.id}`}
                      >
                        Отмена
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => convertToTaskMutation.mutate(note.id)}
                        disabled={convertToTaskMutation.isPending}
                        data-testid={`button-convert-${note.id}`}
                        title="Преобразовать в задачу"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(note.id)}
                        data-testid={`button-delete-${note.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить стикер?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Стикер будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
