import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export { formatDuration } from '@rtams/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MM-dd-yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MM-dd-yyyy hh:mm a');
}

export function formatShortDateTime(date: string | Date): string {
  return format(new Date(date), 'MM/dd hh:mm a');
}
