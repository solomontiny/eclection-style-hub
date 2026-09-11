import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-paystack-signature");
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
          console.error("Paystack webhook is missing PAYSTACK_SECRET_KEY");
          return new Response(null, { status: 500 });
        }
        if (!signature) return new Response(null, { status: 400 });

        const body = await request.text();
        const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");

        const expectedSignature = Buffer.from(hash, "hex");
        const receivedSignature = Buffer.from(signature, "hex");
        if (
          expectedSignature.length !== receivedSignature.length ||
          !crypto.timingSafeEqual(expectedSignature, receivedSignature)
        ) {
          return new Response(null, { status: 400 });
        }

        let event: unknown;
        try {
          event = JSON.parse(body);
        } catch {
          console.warn("Paystack webhook received invalid JSON");
          return new Response(null, { status: 400 });
        }

        if (!event || typeof event !== "object") return new Response(null, { status: 400 });

        const payload = event as {
          event?: unknown;
          data?: {
            reference?: unknown;
            status?: unknown;
            amount?: unknown;
            currency?: unknown;
          };
        };

        if (payload.event === "charge.success") {
          const { reference, status, amount, currency } = payload.data ?? {};
          if (
            typeof reference !== "string" ||
            typeof amount !== "number" ||
            status !== "success" ||
            currency !== "NGN"
          ) {
            console.warn("Paystack webhook received an invalid charge.success payload");
            return new Response(null, { status: 400 });
          }

          const { data: order, error: orderError } = await supabaseAdmin
            .from("orders")
            .select("id, total, payment_status")
            .eq("paystack_reference", reference)
            .maybeSingle();

          if (orderError) {
            console.error("Paystack webhook could not load the matching order", {
              code: orderError.code,
            });
            return new Response(null, { status: 500 });
          }

          if (
            order &&
            order.payment_status !== "paid" &&
            Math.abs(amount - order.total * 100) < 100
          ) {
            const { error: updateError } = await supabaseAdmin
              .from("orders")
              .update({ payment_status: "paid" })
              .eq("id", order.id);

            if (updateError) {
              console.error("Paystack webhook could not mark the order as paid", {
                code: updateError.code,
              });
              return new Response(null, { status: 500 });
            }
          }
        }

        return new Response(null, { status: 200 });
      },
    },
  },
});
