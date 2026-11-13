import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CUSTOMER_NOTIFICATION_PAGE_SIZE,
  CUSTOMER_ORDER_PAGE_SIZE,
  countUnreadCustomerNotifications,
  customerNotificationPageQueryKey,
  customerOrderPageQueryKey,
  fetchCustomerNotificationPage,
  fetchCustomerOrderPage,
  markCustomerNotificationRead,
} from "../src/lib/customer-account-queries.mjs";

function mockSupabase(rows) {
  const calls = [];
  return {
    calls,
    from(table) {
      const query = { table, filters: [], orders: [], limitCount: null, cursorFilter: null };
      calls.push(query);
      const builder = {
        select(columns) {
          query.columns = columns;
          return this;
        },
        eq(column, value) {
          query.filters.push([column, value]);
          return this;
        },
        or(filter) {
          query.cursorFilter = filter;
          return this;
        },
        order(column, options) {
          query.orders.push([column, options.ascending]);
          return this;
        },
        limit(value) {
          query.limitCount = value;
          return this;
        },
        then(resolve, reject) {
          let result = rows.filter((row) =>
            query.filters.every(([column, value]) => row[column] === value),
          );
          if (query.cursorFilter) {
            const match = query.cursorFilter.match(
              /^created_at\.lt\.(.*),and\(created_at\.eq\.(.*),id\.lt\.(.*)\)$/,
            );
            assert.ok(match, "uses a created_at/id cursor filter");
            result = result.filter(
              (row) =>
                row.created_at < match[1] || (row.created_at === match[2] && row.id < match[3]),
            );
          }
          result.sort((left, right) => {
            for (const [column, ascending] of query.orders) {
              const comparison = String(left[column]).localeCompare(String(right[column]));
              if (comparison !== 0) return ascending ? comparison : -comparison;
            }
            return 0;
          });
          return Promise.resolve({ data: result.slice(0, query.limitCount), error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return builder;
    },
  };
}

const orderFixture = (n, userId = "customer-a") => ({
  id: `order-${String(n).padStart(3, "0")}`,
  user_id: userId,
  created_at: new Date(Date.UTC(2026, 0, n)).toISOString(),
  order_number: `SA-${n}`,
  total: n * 100,
  status: "processing",
  payment_status: n % 2 ? "paid" : "pending",
  payment_method: "bank_transfer",
});

test("order home and history use one stable key and one shared projection; older cursors have separate keys", async () => {
  assert.deepEqual(
    customerOrderPageQueryKey("customer-a"),
    customerOrderPageQueryKey("customer-a"),
  );
  assert.notDeepEqual(
    customerOrderPageQueryKey("customer-a"),
    customerOrderPageQueryKey("customer-a", {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "order-001",
    }),
  );
  const [home, history] = await Promise.all([
    readFile(new URL("../src/routes/account.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/account.orders.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [home, history]) {
    assert.match(source, /customerOrderPageQueryKey\(user\?\.id\)/);
    assert.match(source, /fetchCustomerOrderPage\(\{ client: supabase, userId: user!\.id \}\)/);
  }
});

test("customer order pages are bounded, newest-first, customer-scoped, and cursor without duplicates", async () => {
  const rows = Array.from({ length: 29 }, (_, index) => orderFixture(index + 1));
  rows.push(orderFixture(99, "customer-b"));
  const firstClient = mockSupabase(rows);
  const first = await fetchCustomerOrderPage({ client: firstClient, userId: "customer-a" });
  assert.equal(first.items.length, CUSTOMER_ORDER_PAGE_SIZE);
  assert.equal(firstClient.calls[0].limitCount, CUSTOMER_ORDER_PAGE_SIZE + 1);
  assert.deepEqual(firstClient.calls[0].filters, [["user_id", "customer-a"]]);
  assert.deepEqual(firstClient.calls[0].orders, [
    ["created_at", false],
    ["id", false],
  ]);
  assert.equal(first.items[0].id, "order-029");

  const secondClient = mockSupabase(rows);
  const second = await fetchCustomerOrderPage({
    client: secondClient,
    userId: "customer-a",
    cursor: first.nextCursor,
  });
  assert.equal(second.items.length, CUSTOMER_ORDER_PAGE_SIZE);
  assert.ok(secondClient.calls[0].cursorFilter);
  assert.equal(new Set([...first.items, ...second.items].map((order) => order.id)).size, 24);
  assert.ok([...first.items, ...second.items].every((order) => order.user_id === "customer-a"));
});

test("empty order history has no next cursor and requires an authenticated customer ID", async () => {
  const result = await fetchCustomerOrderPage({ client: mockSupabase([]), userId: "customer-a" });
  assert.deepEqual(result, { items: [], nextCursor: null });
  await assert.rejects(
    fetchCustomerOrderPage({ client: mockSupabase([]), userId: "" }),
    /authenticated customer/,
  );
});

test("customer notifications are bounded and unread counts reflect read state", async () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({
    ...orderFixture(index + 1),
    type: "payment_confirmed",
    title: "Payment confirmed",
    message: null,
    is_read: index % 2 === 0,
    order_id: `order-${index + 1}`,
    orders: { order_number: `SA-${index + 1}` },
  }));
  const client = mockSupabase(rows);
  const page = await fetchCustomerNotificationPage({ client, userId: "customer-a" });
  assert.equal(page.items.length, CUSTOMER_NOTIFICATION_PAGE_SIZE);
  assert.equal(client.calls[0].limitCount, CUSTOMER_NOTIFICATION_PAGE_SIZE + 1);
  assert.deepEqual(client.calls[0].filters, [["user_id", "customer-a"]]);
  assert.equal(page.items[0].id, "order-025");
  assert.equal(countUnreadCustomerNotifications(page.items), 10);
  const unreadNotification = page.items.find((notification) => !notification.is_read);
  const updatedPage = markCustomerNotificationRead(page, unreadNotification.id);
  assert.equal(
    updatedPage.items.find((notification) => notification.id === unreadNotification.id).is_read,
    true,
  );
  assert.equal(countUnreadCustomerNotifications(updatedPage.items), 9);
  assert.equal(
    countUnreadCustomerNotifications(page.items.map((row) => ({ ...row, is_read: true }))),
    0,
  );
  assert.notDeepEqual(
    customerNotificationPageQueryKey("customer-a"),
    customerNotificationPageQueryKey("customer-a", {
      createdAt: page.items.at(-1).created_at,
      id: page.items.at(-1).id,
    }),
  );
});

test("empty notification history and customer order detail stay safely scoped", async () => {
  const result = await fetchCustomerNotificationPage({
    client: mockSupabase([]),
    userId: "customer-a",
  });
  assert.deepEqual(result, { items: [], nextCursor: null });
  const detail = await readFile(
    new URL("../src/routes/account.orders.$id.tsx", import.meta.url),
    "utf8",
  );
  assert.match(detail, /\.eq\("id", id\)/);
  assert.match(detail, /\.eq\("user_id", user!\.id\)/);
});
