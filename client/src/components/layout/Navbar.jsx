import { LogOut, User } from "lucide-react";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/use_auth";
import GithubIcon from "../common/GithubIcon";

/**
 * Application Navigation Bar Component
 * 
 * Renders the top navigation bar for authenticated users, providing links to dashboards
 * and user-specific actions.
 * 
 * Flow:
 * 1. Retrieves current user and authentication state from the useAuth hook.
 * 2. Displays the application brand (Taskly) linking to the projects dashboard.
 * 3. Provides navigation links (currently GitHub integration).
 * 4. Shows the current user's name/username.
 * 5. Provides a Logout button that triggers the logout function from useAuth.
 */
const AppNavbar = () => {
  const { user, logout } = useAuth();
  
  return (
    <Navbar expand="lg" className="navbar-premium sticky-top glass mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/projects" className="navbar-brand-premium">
          Taskly
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          <Nav className="align-items-center gap-3">
            <Nav.Link as={Link} to="/integrations/github" className="d-flex align-items-center gap-2">
              <GithubIcon size={18} />
              <span>GitHub</span>
            </Nav.Link>
            
            <div className="vr d-none d-lg-block mx-2" style={{ height: '24px', opacity: 0.2 }}></div>
            
            <Nav.Item className="d-flex align-items-center">
              <Nav.Link 
                as={Link} 
                to="/profile" 
                className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill profile-link-nav" 
                style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', textDecoration: 'none' }}
              >
                <User size={16} />
                <span className="fw-semibold small">
                  {user?.name || user?.username}
                </span>
              </Nav.Link>
            </Nav.Item>
            
            <Nav.Item>
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={logout}
                className="d-flex align-items-center gap-2 border-0"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
