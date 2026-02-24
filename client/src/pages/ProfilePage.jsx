import { Hash, LogOut, Mail, RefreshCw, User, UserCircle } from "lucide-react";
import { useState } from "react";
import { Button, Card, Col, Container, Row, Spinner } from "react-bootstrap";
import { useAuth } from "../hooks/use_auth";

// User Profile Component
/**
 * User Profile Component
 * 
 * Displays the authenticated user's profile information and provides session management.
 * 
 * Flow:
 * 1. Retrieves user data from the central AuthProvider.
 * 2. Renders user details: Name, Email, Username, ID.
 * 3. Provides a "Sync Profile Data" button to re-fetch fresh data from the server.
 * 4. Includes a prominent "Sign Out" button to terminate the session.
 */
const UserProfile = () => {
  const { user, logout, getProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshProfile = async () => {
    setIsLoading(true);
    await getProfile();
    setIsLoading(false);
  };

  if (!user) return null;

  return (
    <Container className="py-5">
      <Card className="border-0 shadow-premium glass max-w-lg mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Body className="p-5">
          <div className="text-center mb-5">
            <div className="d-inline-flex align-items-center justify-content-center p-4 bg-primary bg-opacity-10 rounded-circle mb-4">
              <UserCircle size={48} className="text-primary" />
            </div>
            <h2 className="h3 fw-bold font-outfit mb-1">{user.name}</h2>
            <p className="text-muted">Personal Workspace</p>
          </div>

          <div className="bg-white bg-opacity-50 rounded-4 p-4 border border-light mb-4 text-start">
            <div className="mb-4">
              <label className="small fw-bold text-muted d-flex align-items-center gap-2 mb-1">
                <User size={14} /> USERNAME
              </label>
              <div className="fw-medium text-dark">{user.username}</div>
            </div>
            
            <div className="mb-4">
              <label className="small fw-bold text-muted d-flex align-items-center gap-2 mb-1">
                <Mail size={14} /> EMAIL ADDRESS
              </label>
              <div className="fw-medium text-dark">{user.email}</div>
            </div>
          </div>

          <div className="d-grid gap-3">
            <Button
              variant="outline-primary"
              onClick={handleRefreshProfile}
              disabled={isLoading}
              className="d-flex align-items-center justify-content-center gap-2 py-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" /> Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} /> Sync Profile Data
                </>
              )}
            </Button>

            <Button
              variant="danger"
              onClick={logout}
              className="d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
            >
              <LogOut size={16} /> Sign Out
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};
export default UserProfile;
