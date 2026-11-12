export function getOrderIdFromSearch(search: string): string | null;
export function setOrderIdInSearch(search: string, id: string | null): string;
export function summarizePaidRevenue(orders: Array<{ status: string; payment_status: string; total: number | null }> | null | undefined): number;
