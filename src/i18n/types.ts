export type Language = 'en' | 'zh-CN';

export interface TranslationKeys {
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    confirm: string;
    search: string;
    filter: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    yes: string;
    no: string;
    or: string;
    and: string;
    of: string;
    noData: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  navigation: {
    home: string;
    subscriptions: string;
    reports: string;
    settings: string;
    dashboard: string;
    expenseReports: string;
  };
  subscription: {
    title: string;
    add: string;
    edit: string;
    delete: string;
    name: string;
    amount: string;
    category: string;
    paymentMethod: string;
    renewalDate: string;
    status: string;
    active: string;
    inactive: string;
    upcoming: string;
    expired: string;
  };
  dashboard: {
    title: string;
    monthlyExpense: string;
    upcomingRenewals: string;
    recentlyPaid: string;
    categoryBreakdown: string;
    totalSubscriptions: string;
    averageMonthly: string;
  };
  settings: {
    title: string;
    language: string;
    theme: string;
    currency: string;
    notifications: string;
    general: string;
    appearance: string;
    preferences: string;
  };
  validation: {
    required: string;
    email: string;
    minLength: string;
    maxLength: string;
    number: string;
    invalidFormat: string;
  };
}