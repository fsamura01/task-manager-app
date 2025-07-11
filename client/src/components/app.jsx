import "bootstrap/dist/css/bootstrap.min.css";
import AuthContent from "./auth_content_component";
import AuthProvider from "./authentication_provider_component";
// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <AuthContent />
    </AuthProvider>
  );
};

export default App;
