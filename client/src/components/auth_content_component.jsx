import { Route, Routes } from "react-router-dom";
import AppNavbar from "./app_navbar_component";
import AuthScreen from "./auth_screen_component";
import ProjectsDashboard from "./projects_dashboard_component";
import TasksDashboard from "./tasks_dash_board_component";

// Import the useAuth hook from your authentication provider file
import { useAuth } from "./authentication_provider_component";

// Auth Content Component
const AuthContent = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div>
      <AppNavbar />
      <ProjectsDashboard />
      {/* <TasksDashboard /> */}
    </div>
  );
};
export default AuthContent;
