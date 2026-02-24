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

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div>
      <AppNavbar />
      {/* This is where we implement the nested routing structure */}
      <Routes>
        {/* Root route shows the projects dashboard */}
        <Route path="/" element={<ProjectsDashboard />} />

        {/* Projects route also shows the projects dashboard */}
        <Route path="/projects" element={<ProjectsDashboard />} />

        {/* Individual project route shows tasks scoped to that project */}
        <Route path="/projects/:projectId/tasks" element={<TasksDashboard />} />

        {/* Individual project route shows tasks scoped to that project */}
        <Route path="/web-socket-test" element={<WebSocketTest />} />

        {/* GitHub integrated component */}
        <Route
          path="/integrations/github"
          element={<GitHubIntegrationComponent />}
        />

        <Route path="/github-callback" element={<GitHubCallback />} />
        
        {/* User profile route */}
         <Route path="/profile" element={<UserProfile />} />

        {/* Fallback route for any unmatched paths */}
        <Route path="*" element={<ProjectsDashboard />} />
      </Routes>
    </div>
  );
};

export default AuthContent;
