import { Route, Routes } from "react-router-dom";
import AppNavbar from "./components/layout/Navbar";
import AuthScreen from "./pages/AuthPage";
import GitHubCallback from "./pages/GithubCallbackPage";
import GitHubIntegrationComponent from "./pages/GithubIntegrationPage";
import ProjectsDashboard from "./pages/ProjectsPage";
import TasksDashboard from "./pages/TasksPage";
import WebSocketTest from "./pages/WebSocketTestPage";

// Import the useAuth hook from your authentication provider file
import { useAuth } from "./hooks/use_auth";
import UserProfile from "./pages/ProfilePage";
// Auth Content Component
/**
 * Authentication Content Handler
 * 
 * Manages the routing logic based on the user's authentication status. It serves as 
 * the primary conditional renderer for the authenticated vs. unauthenticated experience.
 * 
 * Flow:
 * 1. Checks 'isAuthenticated' status from useAuth hook.
 * 2. If user is NOT authenticated: Renders the AuthScreen (Login/Register interface).
 * 3. If user IS authenticated:
 *    - Renders the AppNavbar.
 *    - Sets up the main application routes, including:
 *      * Projects Dashboard (Root path)
 *      * Tasks Dashboard (Project-specific)
 *      * GitHub Integration
 *    - Handles route matching and redirects.
 */
const AuthContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {isAuthenticated && <AppNavbar />}
      <Routes>
        {/* Routes accessible only when authenticated */}
        {isAuthenticated ? (
          <>
            <Route path="/" element={<ProjectsDashboard />} />
            <Route path="/projects" element={<ProjectsDashboard />} />
            <Route path="/projects/:projectId/tasks" element={<TasksDashboard />} />
            <Route path="/web-socket-test" element={<WebSocketTest />} />
            <Route path="/integrations/github" element={<GitHubIntegrationComponent />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<ProjectsDashboard />} />
          </>
        ) : (
          <>
            {/* Routes accessible when NOT authenticated */}
            <Route path="/github-callback" element={<GitHubCallback />} />
            <Route path="*" element={<AuthScreen />} />
          </>
        )}
        
        {/* Routes accessible always (e.g. debugging or universal callbacks) */}
        <Route path="/github-callback" element={<GitHubCallback />} />
      </Routes>
    </div>
  );
};

export default AuthContent;
