INSERT INTO public.shop_settings (id, store_name, vat_rate, is_vat_enabled)
VALUES ('default', 'SupplierAffordable', 0, false)
ON CONFLICT (id) DO NOTHING;
