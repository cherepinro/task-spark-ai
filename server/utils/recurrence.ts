import type { Task } from "@shared/schema";

export function calculateNextOccurrence(
  task: Task,
  completedDate: Date = new Date()
): Date | null {
  if (!task.isRecurring || !task.recurrencePattern || !task.dueDate) {
    return null;
  }

  const interval = parseInt(task.recurrenceInterval || "1", 10);
  const nextDate = new Date(task.dueDate);

  switch (task.recurrencePattern) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + interval * 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      return null;
  }

  // Check if we've passed the end date
  if (task.recurrenceEndDate && nextDate > new Date(task.recurrenceEndDate)) {
    return null;
  }

  return nextDate;
}

export function shouldCreateNextOccurrence(task: Task): boolean {
  if (!task.isRecurring || !task.recurrencePattern) {
    return false;
  }

  // Don't create if task isn't completed
  if (task.status !== "completed") {
    return false;
  }

  // Check if end date has passed
  if (task.recurrenceEndDate && new Date() > new Date(task.recurrenceEndDate)) {
    return false;
  }

  return true;
}
