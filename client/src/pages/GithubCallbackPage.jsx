import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, Container, Spinner } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import GithubIcon from "../components/common/GithubIcon";
import { useAuth } from "../hooks/use_auth";

/**
 * GitHub OAuth Callback Handler
 * 
 * Processes the redirect from GitHub after user authorization.
 * 
 * Flow:
 * 1. Extracts query parameters (success, error, flow_id, username) from the URL.
 * 2. Prevents double-execution using a useRef guard (React Strict Mode safety).
 * 3. If error is present, redirects to integration page with error message.
 * 4. If success and flow_id are present:
 *    - make a POST request to '/api/integrations/github/connect' to finalize the integration.
 *    - Updates UI state to show processing, success, or error.
 *    - Redirects to the GitHub integration page upon completion.
 */
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
    <Container className="d-flex align-items-center justify-content-center min-vh-100 bg-light bg-opacity-50">
      <Card className="border-0 shadow-premium glass text-center p-5" style={{ maxWidth: '400px' }}>
        <Card.Body>
          <div className="mb-4">
            <div className="d-inline-flex align-items-center justify-content-center p-3 bg-white rounded-circle shadow-sm">
               <GithubIcon size={48} className="text-dark" />
            </div>
          </div>
          
          <h3 className="fw-bold mb-3">GitHub Integration</h3>
          
          {status === "processing" && (
            <div className="fade-in">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p className="text-muted fw-medium">Initializing connection...</p>
            </div>
          )}
          
          {status === "connecting" && (
             <div className="fade-in">
              <Spinner animation="grow" variant="primary" className="mb-3" />
              <p className="text-muted fw-medium">Securely linking your account...</p>
            </div>
          )}
          
          {status === "success" && (
             <div className="fade-in-up">
              <CheckCircle size={48} className="text-success mb-3" />
              <h5 className="fw-bold text-success">Connected Successfully!</h5>
              <p className="text-muted small">Redirecting you back to settings...</p>
            </div>
          )}
          
          {status === "error" && (
            <div className="fade-in-up">
              <XCircle size={48} className="text-danger mb-3" />
              <h5 className="fw-bold text-danger">Connection Failed</h5>
              <p className="text-muted small">Redirecting you back to try again...</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default GitHubCallback;
