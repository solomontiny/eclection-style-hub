export const CUSTOMER_ORDER_PAGE_SIZE = 12;
export const CUSTOMER_NOTIFICATION_PAGE_SIZE = 20;

// Keep the home summary and the full order history on one cached data shape.
export const CUSTOMER_ORDER_SELECT =
  "id, order_number, total, status, payment_status, payment_method, created_at";
export const CUSTOMER_NOTIFICATION_SELECT =
  "id, type, title, message, is_read, created_at, order_id, orders(order_number)";

export function customerOrderPageQueryKey(userId, cursor = null) {
  return cursor
    ? ["account-orders", userId, "older-v1", cursor.createdAt, cursor.id]
    : ["account-orders", userId, "recent-v1"];
}

export function customerNotificationPageQueryKey(userId, cursor = null) {
  return cursor
    ? ["customer-notifications", userId, "older-v1", cursor.createdAt, cursor.id]
    : ["customer-notifications", userId, "recent-v1"];
}

export function getNextCustomerPageCursor(items, pageSize) {
  if (!Array.isArray(items) || items.length <= pageSize) return null;
  const lastItem = items[pageSize - 1];
  if (!lastItem?.created_at || !lastItem?.id) return null;
  return { createdAt: lastItem.created_at, id: lastItem.id };
}

export function countUnreadCustomerNotifications(notifications = []) {
  return notifications.reduce(
    (count, notification) => count + (notification?.is_read === false ? 1 : 0),
    0,
  );
}

export function markCustomerNotificationRead(page, notificationId) {
  if (!page) return page;
  return {
    ...page,
    items: page.items.map((notification) =>
      notification.id === notificationId ? { ...notification, is_read: true } : notification,
    ),
  };
}

function olderThanFilter(cursor) {
  // created_at comes from this table and id is a UUID; both are URL-safe values.
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

async function fetchCustomerPage({ client, table, select, userId, cursor, pageSize }) {
  if (!userId) throw new Error("An authenticated customer is required.");

  let query = client.from(table).select(select).eq("user_id", userId);

  if (cursor) query = query.or(olderThanFilter(cursor));

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (error) throw error;
  const items = data ?? [];
  return {
    items: items.slice(0, pageSize),
    nextCursor: getNextCustomerPageCursor(items, pageSize),
  };
}

export function fetchCustomerOrderPage({ client, userId, cursor = null }) {
  return fetchCustomerPage({
    client,
    table: "orders",
    select: CUSTOMER_ORDER_SELECT,
    userId,
    cursor,
    pageSize: CUSTOMER_ORDER_PAGE_SIZE,
  });
}

export function fetchCustomerNotificationPage({ client, userId, cursor = null }) {
  return fetchCustomerPage({
    client,
    table: "customer_notifications",
    select: CUSTOMER_NOTIFICATION_SELECT,
    userId,
    cursor,
    pageSize: CUSTOMER_NOTIFICATION_PAGE_SIZE,
  });
}
