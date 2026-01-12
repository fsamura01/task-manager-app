// Updated GitHubCallback.jsx with double-execution protection
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./hooks/use_auth";

const GitHubCallback = () => {
  console.log("=== GitHubCallback component loaded ===");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [status, setStatus] = useState("processing");
  const hasRun = useRef(false); // Add this ref to track execution

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasRun.current) {
      console.log("GitHubCallback already executed, skipping");
      return;
    }

    const handleCallback = async () => {
      hasRun.current = true; // Mark as executed immediately

      const success = searchParams.get("success");
      const error = searchParams.get("error");
      const flow_id = searchParams.get("flow_id");
      const username = searchParams.get("username");

      console.log("Callback params:", {
        success,
        error,
        flow_id: !!flow_id,
        username,
        token: !!token,
      });

      if (error) {
        navigate("/integrations/github?error=" + encodeURIComponent(error));
        return;
      }

      if (success && flow_id && token) {
        try {
          console.log("Calling connect API with temp key...");
          setStatus("connecting");

          const response = await fetch(
            "http://localhost:5000/api/integrations/github/connect",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ flow_id: flow_id }),
            }
          );

          const result = await response.json();
          console.log("Connect API response:", result);

          if (result.success) {
            console.log("Integration successful!");
            setStatus("success");
            setTimeout(() => {
              navigate("/integrations/github?connected=true");
            }, 1500);
          } else {
            throw new Error(result.error || "Integration failed");
          }
        } catch (error) {
          console.error("Connect API failed:", error);
          setStatus("error");
          setTimeout(() => {
            navigate(
              "/integrations/github?error=" + encodeURIComponent(error.message)
            );
          }, 2000);
        }
      } else {
        console.log("Missing required data:", {
          success,
          tempKey: !!flow_id,
          token: !!token,
        });
        navigate("/integrations/github?error=missing_data");
      }
    };

    handleCallback();
  }, [navigate, searchParams, token]);

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h2>Processing GitHub Connection...</h2>
      {status === "processing" && <p>Initializing...</p>}
      {status === "connecting" && <p>Saving integration...</p>}
      {status === "success" && <p>✅ Success! Redirecting...</p>}
      {status === "error" && <p>❌ Failed. Redirecting...</p>}
    </div>
  );
};

export default GitHubCallback;
