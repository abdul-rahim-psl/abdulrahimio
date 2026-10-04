// Production builds run in UTC on Vercel; pinning it keeps local builds on the same dates.
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const formatDate = (date: Date) => dateFormat.format(date);

export const formatNumber = (value: number) => value.toLocaleString('en-US');
