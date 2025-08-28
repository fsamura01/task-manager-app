import { Route, Routes } from "react-router-dom";
import AppNavbar from "./app_navbar_component";
import AuthScreen from "./auth_screen_component";
//import LoginForm from "./login_form_component";
import ProjectsDashboard from "./projects_dashboard_component";
import TasksDashboard from "./tasks_dash_board_component";

// Import the useAuth hook from your authentication provider file
import { useAuth } from "./hooks/use_auth";
// Auth Content Component
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

        {/* Fallback route for any unmatched paths */}
        <Route path="*" element={<ProjectsDashboard />} />
      </Routes>
    </div>
  );
};

export default AuthContent;
