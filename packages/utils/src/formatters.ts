// Formatting Utilities

export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(
  value: number,
  decimals: number = 2,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(
  value: number,
  decimals: number = 2,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'time' = 'short',
  locale: string = 'en-US'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    case 'long':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    case 'time':
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    default:
      return d.toISOString();
  }
}

export function formatPips(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)} pips`;
}

export function formatPrice(value: number, decimals: number = 5): string {
  return value.toFixed(decimals);
}

export function formatVolume(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)} lots`;
}
