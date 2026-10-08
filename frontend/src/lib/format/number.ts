export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(undefined, options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string = 'EGP',
): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value);
}
