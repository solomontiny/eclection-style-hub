import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isSubscribed = true;

    async function checkVerification() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!isSubscribed) return;

      if (session) {
        setStatus("success");
      } else if (error) {
        setStatus("error");
        setErrorMsg("The verification link is invalid or has expired.");
      } else {
        // Not signed in yet, need to wait for auth state change
      }
    }

    // Check immediately
    checkVerification();

    // Listen for auth state change (e.g., user clicking the email link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      if (event === 'SIGNED_IN' && session) {
        setStatus("success");
      } else if (event === 'USER_UPDATED' && session) {
        setStatus("success");
      }
    });

    // Cleanup
    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "verifying") {
    return (
      <section className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md card-elegant p-8 text-center">
          <h1 className="font-display text-3xl mb-4">Verifying...</h1>
          <p className="text-muted-foreground">Please wait while we verify your email.</p>
        </div>
      </section>
    );
  }

  if (status === "success") {
    return (
      <section className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md card-elegant p-8 text-center">
          <h1 className="font-display text-3xl mb-4 text-green-600">Email Verified Successfully! ✅</h1>
          <p className="text-muted-foreground mb-6">
            Your SupplierAffordable account has been successfully created and verified.
          </p>
          <Button onClick={() => navigate({ to: "/login", search: { redirect: undefined } })}>
            Continue to Login
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md card-elegant p-8 text-center">
        <h1 className="font-display text-3xl mb-4 text-destructive">Verification Link Invalid or Expired</h1>
        <p className="text-muted-foreground mb-6">
          {errorMsg || "This verification link is no longer valid or has already been used."}
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/signup" className="btn-primary text-center">
            Resend Verification Email
          </Link>
          <Link to="/login" search={{ redirect: undefined }} className="text-primary font-medium hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </section>
  );
}
