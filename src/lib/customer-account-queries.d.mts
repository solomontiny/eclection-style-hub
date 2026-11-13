export type CustomerHistoryCursor = { createdAt: string; id: string };

export type CustomerOrderSummary = {
  id: string;
  order_number: string;
  total: number | string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
};

export type CustomerNotification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  order_id: string | null;
  orders: { order_number: string } | { order_number: string }[] | null;
};

export type CustomerPage<T> = { items: T[]; nextCursor: CustomerHistoryCursor | null };

export const CUSTOMER_ORDER_PAGE_SIZE: number;
export const CUSTOMER_NOTIFICATION_PAGE_SIZE: number;
export const CUSTOMER_ORDER_SELECT: string;
export const CUSTOMER_NOTIFICATION_SELECT: string;
export function customerOrderPageQueryKey(
  userId: string | undefined,
  cursor?: CustomerHistoryCursor | null,
): readonly unknown[];
export function customerNotificationPageQueryKey(
  userId: string | undefined,
  cursor?: CustomerHistoryCursor | null,
): readonly unknown[];
export function getNextCustomerPageCursor<T extends { created_at?: string; id?: string }>(
  items: T[],
  pageSize: number,
): CustomerHistoryCursor | null;
export function countUnreadCustomerNotifications(
  notifications?: Pick<CustomerNotification, "is_read">[],
): number;
export function markCustomerNotificationRead<T extends { id: string; is_read: boolean }>(
  page: CustomerPage<T> | undefined,
  notificationId: string,
): CustomerPage<T> | undefined;
export function fetchCustomerOrderPage(args: {
  client: any;
  userId: string;
  cursor?: CustomerHistoryCursor | null;
}): Promise<CustomerPage<CustomerOrderSummary>>;
export function fetchCustomerNotificationPage(args: {
  client: any;
  userId: string;
  cursor?: CustomerHistoryCursor | null;
}): Promise<CustomerPage<CustomerNotification>>;
