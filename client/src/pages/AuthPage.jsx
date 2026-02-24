import { useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import LoginForm from "../components/features/auth/LoginForm";
import RegisterForm from "../components/features/auth/RegistrationForm";

/**
 * Authentication Screen Component
 * 
 * Acts as the entry point container for user authentication, managing the switch between
 * login and registration forms.
 * 
 * Flow:
 * 1. Manages 'isLogin' local state (boolean) to toggle between views.
 * 2. Renders a unified, branded layout with the application logo ("Taskly").
 * 3. Conditionally renders either the LoginForm or RegisterForm component based on state.
 * 4. Passes state setter functions to child components to allow switching between modes.
 */
const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Container fluid className="d-flex align-items-center justify-content-center min-vh-100 bg-light bg-opacity-50">
      <Row className="w-100 justify-content-center">
        <Col xs={12} sm={10} md={8} lg={5} xl={4} className="d-flex flex-column align-items-center">
          <div className="text-center mb-5 fade-in-up">
            <div className="d-inline-flex align-items-center justify-content-center p-3 bg-white rounded-circle shadow-sm mb-3">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h4 className="fw-bold font-outfit text-dark mb-1">Taskly.</h4>
            <p className="text-muted small">Premium Task Management Workspace</p>
          </div>

          <div className="w-100 fade-in-up delay-100">
            {isLogin ? (
              <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
            ) : (
              <RegisterForm
                onSwitchToLogin={() => {
                  setIsLogin(true);
                }}
              />
            )}
          </div>
          
          <div className="mt-5 text-center text-muted small fade-in-up delay-200">
            &copy; {new Date().getFullYear()} Taskly Workspace. All rights reserved.
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default AuthScreen;
