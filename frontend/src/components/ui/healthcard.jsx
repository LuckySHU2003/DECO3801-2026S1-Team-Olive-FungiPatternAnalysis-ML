import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export function HealthCard() {
  const [status, setStatus] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkHealth() {
      try {
        setStatus("checking");
        setErrorMessage("");

        const res = await fetch(`${API_BASE_URL}/health`);

        if (!res.ok) {
          const text = await res.text();

          console.error("Backend health check failed:", {
            url: `${API_BASE_URL}/health`,
            status: res.status,
            statusText: res.statusText,
            response: text,
          });

          setStatus("disconnected");
          setErrorMessage(`HTTP ${res.status}: ${res.statusText}`);
          return;
        }

        setStatus("connected");
      } catch (error) {
        console.error("Backend connection error:", {
          url: `${API_BASE_URL}/health`,
          message: error.message,
          error,
        });

        setStatus("disconnected");
        setErrorMessage(error.message || "Failed to connect to backend");
      }
    }

    checkHealth();

    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status === "connected";
  const isChecking = status === "checking";

  return (
    <Card className="mt-6 rounded-2xl border-emerald-100 bg-emerald-50 shadow-none">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-emerald-900">
          Server Connection Status
        </p>

        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800">
          {isChecking && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking API...</span>
            </>
          )}

          {isConnected && (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Successfully connected to server API</span>
            </>
          )}

          {!isChecking && !isConnected && (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">API disconnected</span>
            </>
          )}
        </div>

        {!isChecking && !isConnected && errorMessage && (
          <p className="mt-2 break-words text-xs text-red-600">
            {errorMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}