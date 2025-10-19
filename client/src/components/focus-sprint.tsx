import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Pause } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FocusSprintProps {
  sound: "soft-chime" | "white-noise" | "nature-sounds";
  onClose: () => void;
}

export function FocusSprint({ sound, onClose }: FocusSprintProps) {
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes in seconds
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Calculate progress (0 to 1)
  const totalTime = phase === "work" ? 10 * 60 : 2 * 60;
  const progress = 1 - (timeLeft / totalTime);

  // Circle SVG properties
  const size = 400;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    // Enter fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log("Fullscreen not supported:", err);
      });
    }

    // Load and play audio
    if (audioRef.current) {
      audioRef.current.src = `/sounds/${sound}.mp3`;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(err => {
        console.log("Audio playback failed:", err);
      });
    }

    return () => {
      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sound]);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (phase === "work") {
              // Work phase complete, switch to break
              setPhase("break");
              toast({
                title: "Great work!",
                description: "Take a 2-minute break.",
              });
              return 2 * 60; // 2 minutes break
            } else {
              // Break complete, finish sprint
              completeSprint();
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, phase]);

  const completeSprint = async () => {
    try {
      await apiRequest("POST", "/api/stats/sprint-complete", {});
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Sprint completed! 🎉",
        description: "You've completed a focus sprint. Keep up the great work!",
      });
      onClose();
    } catch (error) {
      console.error("Failed to record sprint completion:", error);
      onClose();
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (audioRef.current) {
      if (!isPaused) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      data-testid="focus-sprint-container"
    >
      <audio ref={audioRef} />
      
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4"
        onClick={onClose}
        data-testid="button-close-sprint"
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="flex flex-col items-center gap-8">
        {/* Phase indicator */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">
            {phase === "work" ? "Focus Time" : "Break Time"}
          </h2>
          <p className="text-muted-foreground">
            {phase === "work" 
              ? "Stay focused and make progress" 
              : "Relax and recharge"}
          </p>
        </div>

        {/* Circular progress */}
        <div className="relative">
          <svg width={size} height={size}>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          
          {/* Timer display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div 
                className="text-7xl font-bold font-mono"
                data-testid="text-timer"
              >
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {phase === "work" ? "10 min sprint" : "2 min break"}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <Button
          size="lg"
          variant="outline"
          onClick={togglePause}
          className="gap-2"
          data-testid="button-toggle-pause"
        >
          {isPaused ? (
            <>
              <Play className="h-5 w-5" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-5 w-5" />
              Pause
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
