import { Link } from "@tanstack/react-router";
import officialLogo from "@/assets/supplier-affordable-logo.png";

export function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <img
            src={officialLogo}
            alt="SupplierAffordable"
            width={1024}
            height={1024}
            className="size-16 object-contain"
          />
          <span className="font-display text-3xl font-bold tracking-tight text-foreground">
            SupplierAffordable
          </span>
        </div>
        <div className="space-y-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            WE&apos;RE MAKING A FEW IMPROVEMENTS
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Our store is temporarily undergoing some updates and improvements.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We&apos;ll be back soon with an even better shopping experience.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Thank you for your patience.
          </p>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-[0.3em] font-semibold text-primary">
            COMING BACK SOON
          </p>
        </div>
        <Link to="/admin/login" className="btn-outline text-sm mt-2">
          Admin Access
        </Link>
      </div>
    </div>
  );
}