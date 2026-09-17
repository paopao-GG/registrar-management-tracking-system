const phDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
});

/** Today's date in the Philippines as YYYY-MM-DD. */
export function getPhilippineDate() {
  return phDateFormat.format(new Date());
}

export function getYesterdayPhilippineDate() {
  const date = new Date(`${getPhilippineDate()}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - 1);

  return phDateFormat.format(date);
}
