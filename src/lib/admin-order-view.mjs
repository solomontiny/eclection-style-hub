export function getOrderIdFromSearch(search) {
  return new URLSearchParams(search).get("orderId");
}

export function setOrderIdInSearch(search, id) {
  const params = new URLSearchParams(search);
  if (id) params.set("orderId", id);
  else params.delete("orderId");
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function summarizePaidRevenue(orders) {
  const paid = (orders ?? []).filter(
    (order) => order.status !== "cancelled" && order.payment_status === "paid",
  );
  return paid.reduce((total, order) => total + Number(order.total ?? 0), 0);
}
