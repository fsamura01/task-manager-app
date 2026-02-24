import "bootstrap/dist/css/bootstrap.min.css";
import AuthContent from "./AuthContent";
import AuthProvider from "./context/AuthProvider";
// Main App Component
/**
 * Root Application Component
 * 
 * This is the main entry point for the React application structure.
 * It wraps the entire application with the AuthProvider to ensure authentication
 * state is accessible throughout the component tree.
 * 
 * Flow:
 * 1. Initializes the AuthProvider context.
 * 2. Renders the AuthContent component which handles routing based on auth state.
 */
import { NotificationProvider } from "./context/NotificationContext";

const App = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AuthContent />
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;
