import { useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import LoginForm from "./login_form_component";
import RegisterForm from "./registration_form_component";

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Row className="w-100">
        <Col xs={12} sm={8} md={6} lg={4} className="mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-primary mb-2">Task Manager</h2>
            <p className="text-muted">Organize your tasks efficiently</p>
          </div>

          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default AuthScreen;
