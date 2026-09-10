import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/api/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-paystack-signature");
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!signature || !secret) return new Response(null, { status: 400 });

        const body = await request.text();
        const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");

        if (hash !== signature) return new Response(null, { status: 400 });

        const event = JSON.parse(body);
        if (event.event === "charge.success") {
          const { reference, status, amount, currency } = event.data;

          // Find order
          const { data: order } = await supabase
            .from("orders")
            .select("id, total, payment_status")
            .eq("paystack_reference", reference)
            .single();

          if (
            order &&
            order.payment_status !== "paid" &&
            status === "success" &&
            currency === "NGN" &&
            Math.abs(amount - order.total * 100) < 100
          ) {
            await supabase
              .from("orders")
              .update({ payment_status: "paid" })
              .eq("id", order.id);
          }
        }

        return new Response(null, { status: 200 });
      },
    },
  },
});
