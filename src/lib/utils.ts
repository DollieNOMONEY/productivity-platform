import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Missions from "@/lib/data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// CONTEXT: MISSION PAGE
export const formatDateStr = (d: Date) => {
  // e.g: d = Tue Mar 24 2026 06:17:54 GMT+0700 (Indochina Time)
  const offset = d.getTimezoneOffset() * 60000;
  // converting minutes into ms; 1 minute = 60 second; 1 second = 1,000 milliseconds; 1000 * 60 = 60000
  return new Date(d.getTime() - offset).toISOString().split("T")[0];
  // ISO Dates (Date-Time); Format (YYYY-MM-DDTHH:MM:SSZ); split by T because we do not need H/M/S
  // we convert our localtime to utc time so toISOString is accurate to localtime; e.g: 2026-03-24
};
// const formatDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

export const getDisplayDate = (viewDate: Date) => {
  // CONTEXT: Either naming "Today's Mission, Tomorrow, Yesterday, or toLocaleDateString (Saturday, Mar 28, 2026)"
  const d = new Date(viewDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDateStr(d) === formatDateStr(today)) return "Today's Mission";
  if (formatDateStr(d) === formatDateStr(tomorrow)) return "Tomorrow's Mission";
  if (formatDateStr(d) === formatDateStr(yesterday))
    return "Yesterday's Mission";

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const filterMissions = (
  tasks: Missions.MISSIONPLACEHOLDER[],
  tag: string | null,
  color: string | null,
) => {
  return tasks.filter((t) => {
    const matchTag = tag ? t.tag === tag : true;
    const matchColor = color ? t.color === color : true;
    return matchTag && matchColor;
  });
};
