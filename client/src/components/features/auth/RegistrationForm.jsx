import { ArrowRight, CheckCircle2, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../../../hooks/use_auth";

// Register Component
/**
 * User Registration Form Component
 * 
 * Allows new users to create an account by providing necessary details.
 * 
 * Flow:
 * 1. Collects user information: Full Name, Username, Email, Password.
 * 2. Implements client-side validation (password matching, length checks).
 * 3. Submits data to the registration API endpoint via useAuth context.
 * 4. Upon success, displays a success message and automatically redirects to the Login view.
 * 5. Handles API errors and displays them to the user.
 */
const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    const result = await register(
      formData.username,
      formData.email,
      formData.password,
      formData.name
    );

    setLoading(false);

    // ✅ Redirect to login after successful registration
    if (result.success) {
      setSuccess("Account created successfully. Redirecting...");
      // Switch to login after 2 seconds
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } else {
      setError(result.error || "Registration failed");
    }
  };

  return (
    <Card className="border-0 shadow-premium glass" style={{ width: "100%", maxWidth: "480px" }}>
      <Card.Body className="p-5">
        <div className="text-center mb-5">
            <h1 className="h3 fw-bold mb-2 font-outfit">Join Taskly</h1>
            <p className="text-muted">Create your workspace account</p>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4 border-0 shadow-sm">
            {error}
          </Alert>
        )}
        {success && (
            <Alert variant="success" className="mb-4 border-0 shadow-sm d-flex align-items-center gap-2">
                <CheckCircle2 size={18} /> {success}
            </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-2">
                <User size={14} /> FULL NAME
            </Form.Label>
            <Form.Control
              type="text"
              name="name"
              className="search-input-premium py-2"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
            />
          </Form.Group>

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
              placeholder="Choose a username"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-2">
                <Mail size={14} /> EMAIL ADDRESS
            </Form.Label>
            <Form.Control
              type="email"
              name="email"
              className="search-input-premium py-2"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </Form.Group>

          <Form.Group className="mb-4">
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
              placeholder="Choose a password"
            />
            <Form.Text className="text-muted small">
              Must be at least 6 characters long
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-5">
             <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-2">
                <Lock size={14} /> CONFIRM PASSWORD
            </Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              className="search-input-premium py-2"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
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
                  className="me-2"
                />
                Creating account...
              </>
            ) : (
              <>
                Create Account <ArrowRight size={18} />
              </>
            )}
          </Button>
        </Form>

        <div className="text-center pt-3 border-top">
          <small className="text-muted">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 text-primary fw-bold text-decoration-none"
              onClick={onSwitchToLogin}
              style={{ verticalAlign: "baseline" }}
            >
              Sign in here
            </Button>
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};
export default RegisterForm;
