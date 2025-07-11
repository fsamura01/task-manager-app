import AppNavbar from "./app_navbar_component";
import AuthScreen from "./auth_screen_component";
import Dashboard from "./dash_board_component";

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
      <Dashboard />
    </div>
  );
};
export default AuthContent;
