import { Button, Button, Container, Container, Nav, Nav, Navbar, Navbar } from "react-bootstrap";
import { useAuth, useAuth } from "./hooks/use_auth";

// Navigation Component
const AppNavbar = () => {
  const { user, logout } = useAuth();
  console.log("🚀 ~ AppNavbar ~ logout:", logout);
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand>Task Manager</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <Nav>
            <Nav.Item className="d-flex align-items-center me-3">
              <span className="text-light">
                Welcome, {user?.name || user?.username}!
              </span>
            </Nav.Item>
            <Nav.Item>
              <Button variant="outline-light" size="sm" onClick={logout}>
                Logout
              </Button>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;

// Navigation Component
const AppNavbar = () => {
  const { user, logout } = useAuth();
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand>Task Manager</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <Nav>
            <Nav.Item className="d-flex align-items-center me-3">
              <span className="text-light">
                Welcome, {user?.name || user?.username}!
              </span>
            </Nav.Item>
            <Nav.Item>
              <Button variant="outline-light" size="sm" onClick={logout}>
                Logout
              </Button>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
