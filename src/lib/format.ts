const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDate = (date: Date) => dateFormat.format(date);

export const formatNumber = (value: number) => value.toLocaleString('en-US');
