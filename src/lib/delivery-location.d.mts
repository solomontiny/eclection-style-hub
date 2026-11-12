export interface DeliveryLocation {
  recipient: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  instructions: string;
}
export function getDeliveryLocation(order: {
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_address?: unknown;
} | null | undefined): DeliveryLocation;
