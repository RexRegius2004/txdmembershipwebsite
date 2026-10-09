import { Suspense } from "react";
import ChangePasswordForm from "./ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#ffffff",
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100vh",
              backgroundColor: "#000000",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 24px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "448px",
                border: "1px solid #27272a",
                borderRadius: "16px",
                backgroundColor: "#09090b",
                padding: "28px",
              }}
            >
              <div className="animate-pulse">
                <div className="h-7 w-52 rounded bg-zinc-800" />
                <div className="mt-3 h-4 w-72 rounded bg-zinc-800" />
                <div className="mt-8 h-12 rounded-xl bg-zinc-900" />
                <div className="mt-5 h-12 rounded-xl bg-zinc-900" />
                <div className="mt-5 h-12 rounded-xl bg-zinc-800" />
              </div>
            </div>
          </div>
        }
      >
        <ChangePasswordForm />
      </Suspense>
    </div>
  );
}
