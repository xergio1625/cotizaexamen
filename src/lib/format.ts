import { siteConfig } from '../../site.config';

const money = new Intl.NumberFormat(siteConfig.country.locale, {
  style: 'currency',
  currency: siteConfig.country.currency,
  maximumFractionDigits: 0,
});

export const formatMoney = (amount: number) => money.format(amount);

export const formatDate = (d: Date) =>
  new Intl.DateTimeFormat(siteConfig.country.locale, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
