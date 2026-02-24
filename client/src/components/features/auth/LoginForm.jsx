import { ArrowRight, Lock, User } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../../../hooks/use_auth";

// Login Component
/**
 * User Login Form Component
 * 
 * Provides a secure interface for users to authenticate with their credentials.
 * 
 * Flow:
 * 1. Manages local state for form input (username, password) and UI feedback (loading, error).
 * 2. Validates input and submits credentials via the 'login' function from useAuth context.
 * 3. Handles successful login (redirect managed by auth state change) or displays error messages.
 * 4. Provides a link to switch to the Registration form.
 */
/**
 * LoginForm: The "Entrance Gate"
 * 
 * This component collects credentials and sends them to the server 
 * via the AuthProvider's 'login' function.
 */
const LoginForm = ({ onSwitchToRegister }) => {
  // STATE: Remembers username and password while the user is typing
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // hook: We pull the 'login' tool out of our global AuthContext toolkit.
  const { login } = useAuth();

  /**
   * handleChange: Updates our state as the user types.
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * handleSubmit: Triggered when the user clicks "Sign In".
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop the browser from trying to refresh the page
    setError("");
    setLoading(true);

    // Call the global login function (defined in AuthProvider.jsx)
    const result = await login(formData.username, formData.password);

    if (!result.success) {
      // If the server says "No", show the error message in Red
      setError(typeof result.error === "string" ? result.error : "Failed to sign in.");
    }

    setLoading(false);
  };

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100 py-5">
      <Card style={{ width: "100%", maxWidth: "420px" }} className="border-0 shadow-premium glass">
        <Card.Body className="p-5">
          <div className="text-center mb-5">
            <h1 className="h3 fw-bold mb-2 font-outfit">Welcome Back</h1>
            <p className="text-muted">Sign in to access your workspace</p>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4 border-0 shadow-sm">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-2">
                <User size={14} /> USERNAME
              </Form.Label>
              <Form.Control
                type="text"
                name="username"
                className="search-input-premium py-2"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
              />
            </Form.Group>

            <Form.Group className="mb-5">
              <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-2">
                <Lock size={14} /> PASSWORD
              </Form.Label>
              <Form.Control
                type="password"
                name="password"
                className="search-input-premium py-2"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
            </Form.Group>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-100 mb-4 d-flex align-items-center justify-content-center gap-2 shadow-sm"
              disabled={loading}
              style={{ fontWeight: 600 }}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </Button>
          </Form>

          <div className="text-center pt-3 border-top">
            <small className="text-muted">
              New to Taskly?{" "}
              <Button
                variant="link"
                onClick={onSwitchToRegister}
                className="p-0 text-primary fw-bold text-decoration-none"
                style={{ verticalAlign: "baseline" }}
              >
                Create Account
              </Button>
            </small>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LoginForm;
