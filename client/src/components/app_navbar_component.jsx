import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "./hooks/use_auth";

// Navigation Component

// Navigation Component
const AppNavbar = () => {
  const { user, logout } = useAuth();
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/projects">
          Task Manager
        </Navbar.Brand>
        <Nav.Item className="d-flex align-items-center me-3">
          <Nav.Link as={Link} to="/integrations/github">
            <span className="text-light">GitHub Integration</span>
          </Nav.Link>
        </Nav.Item>

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
