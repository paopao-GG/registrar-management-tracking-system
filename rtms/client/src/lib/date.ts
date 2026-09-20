import { format, parseISO } from 'date-fns';

const phDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
});

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

/*
 * Label for the period a dashboard is showing:
 * "Saturday, September 20, 2026" for one day,
 * "Sep 14 – Sep 20, 2026" for a span.
 */
export function formatPeriod({ startDate, endDate }: DateRange) {
  if (startDate && startDate === endDate) {
    return format(parseISO(startDate), 'EEEE, MMMM d, yyyy');
  }

  if (startDate && endDate) {
    return `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`;
  }

  if (startDate) return `Since ${format(parseISO(startDate), 'MMM d, yyyy')}`;
  if (endDate) return `Up to ${format(parseISO(endDate), 'MMM d, yyyy')}`;

  return 'All dates';
}

/** Today's date in the Philippines as YYYY-MM-DD. */
export function getPhilippineDate() {
  return phDateFormat.format(new Date());
}

/** The Philippine calendar day `days` before today, as YYYY-MM-DD. */
export function getPhilippineDateDaysAgo(days: number) {
  const date = new Date(`${getPhilippineDate()}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - days);

  return phDateFormat.format(date);
}

export function getYesterdayPhilippineDate() {
  return getPhilippineDateDaysAgo(1);
}
