import { getLocalISODate } from '@/components/dateUtils';
import { CATEGORY_QUOTES } from './constants';

export const getTaskTimeStatus = (taskDate: string, startTimeStr: string | null, durationMinutes: number | null, taskStatus: string, isPomodoroActive: boolean = false) => {
  if (taskStatus === 'Done') return { text: 'DONE', color: 'text-zinc-600' };
  if (isPomodoroActive) return { text: 'IN PROGRESS', color: 'text-amber-500 font-bold animate-pulse' };
  if (!startTimeStr) {
    if (taskStatus === 'In Progress') return { text: 'IN PROGRESS', color: 'text-amber-500 font-bold animate-pulse' };
    return null;
  }

  try {
    const todayStr = getLocalISODate();
    if (taskDate !== todayStr) {
      return durationMinutes ? { text: `${durationMinutes}m`, color: 'text-zinc-500' } : null;
    }

    const now = new Date();
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const startTime = new Date(now);
    startTime.setHours(sh, sm, 0, 0);

    const diffMs = startTime.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin > 0) {
      if (diffMin < 60) {
        return { text: `Starts in ${diffMin}m`, color: 'text-amber-500/80 font-bold' };
      } else {
        const hours = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        return { text: `Starts in ${hours}h ${mins}m`, color: 'text-zinc-500' };
      }
    }

    if (durationMinutes) {
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);

      const leftMs = endTime.getTime() - now.getTime();
      const leftMin = Math.round(leftMs / 60000);

      if (leftMin > 0) {
        if (leftMin < 60) {
          return { text: `${leftMin}m left`, color: 'text-emerald-450 font-bold animate-pulse' };
        } else {
          const hours = Math.floor(leftMin / 60);
          const mins = leftMin % 60;
          return { text: `${hours}h ${mins}m left`, color: 'text-emerald-400 font-bold' };
        }
      } else {
        const pastMin = Math.abs(leftMin);
        if (pastMin < 60) {
          return { text: `Overdue ${pastMin}m`, color: 'text-rose-450 font-bold' };
        } else {
          const hours = Math.floor(pastMin / 60);
          const mins = pastMin % 60;
          return { text: `Overdue ${hours}h ${mins}m`, color: 'text-rose-500 font-bold' };
        }
      }
    } else {
      return { text: 'Active', color: 'text-zinc-400' };
    }
  } catch (e) {
    return null;
  }
};

export const findFocusTask = (monthTasks: any[], currentTime: Date) => {
  const todayStr = getLocalISODate();
  const todayTasks = monthTasks.filter(t => t.date === todayStr && t.time && t.duration && t.status !== 'Done');
  
  let activeTask: any = null;
  let activeTimeLeftMs = 0;
  
  let upcomingTask: any = null;
  let upcomingStartLeftMs = 15 * 60 * 1000 + 1000; // max 15 mins
  
  for (const t of todayTasks) {
    try {
      const [sh, sm] = t.time.split(':').map(Number);
      const start = new Date(currentTime);
      start.setHours(sh, sm, 0, 0);
      
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + t.duration);
      
      const timeToStart = start.getTime() - currentTime.getTime();
      const timeToEnd = end.getTime() - currentTime.getTime();
      
      if (timeToStart <= 0 && timeToEnd > 0) {
        activeTask = t;
        activeTimeLeftMs = timeToEnd;
        break; // prioritize active task
      } else if (timeToStart > 0 && timeToStart <= 15 * 60 * 1000) {
        if (timeToStart < upcomingStartLeftMs) {
          upcomingTask = t;
          upcomingStartLeftMs = timeToStart;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  if (activeTask) {
    return { phase: 'active' as const, task: activeTask, timeLeftMs: activeTimeLeftMs };
  }
  if (upcomingTask) {
    return { phase: 'warmup' as const, task: upcomingTask, timeLeftMs: upcomingStartLeftMs };
  }
  return { phase: 'none' as const, task: null, timeLeftMs: 0 };
};

export const getFocusQuote = (task: any) => {
  if (!task) return "";
  const list = CATEGORY_QUOTES[task.category as keyof typeof CATEGORY_QUOTES] || CATEGORY_QUOTES.Others;
  // Stable pseudo-random quote based on task id
  const idNum = parseInt(task._id ? task._id.slice(-4) : "0", 16) || 0;
  return list[idNum % list.length];
};
