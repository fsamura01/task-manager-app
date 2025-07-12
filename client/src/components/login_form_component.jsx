import { useState } from "react";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import { useAuth } from "./authentication_provider_component";

// Login Component
const LoginForm = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(formData.username, formData.password);
    console.log("🚀 ~ handleSubmit ~ result:", result);

    if (!result.success) {
      setError(
        typeof result.error === "string" ? result.error : result.error.message
      );
    }

    setLoading(false);
  };

  return (
    <Container className="d-flex justify-content-center">
      <Card style={{ width: "100%", maxWidth: "400px" }} className="shadow">
        <Card.Body className="p-4">
          <Card.Title className="text-center mb-4 h3">Sign In</Card.Title>

          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
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
              className="w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Don't have an account?{" "}
              <Button
                variant="link"
                onClick={onSwitchToRegister}
                className="p-0 text-decoration-none"
                style={{ verticalAlign: "baseline" }}
              >
                Sign up here
              </Button>
            </small>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LoginForm;
