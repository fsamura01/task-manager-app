import { useEffect, useState } from "react";
import { AuthContext } from "../hooks/use_auth";
import { api } from "../utils/api";
import { useNotification } from "./NotificationContext";

/**
 * Authentication Context Provider
 */
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");
      
      if (storedToken) {
        try {
          const result = await api.get("/auth/profile");
          setUser(result.data);
          setToken(storedToken);
        } catch (error) {
          console.error("Auth initialization failed:", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Helper: always returns a plain string from any error type
  const getErrorMessage = (error) => {
    if (typeof error.message === "string") return error.message;
    if (typeof error.message === "object" && error.message !== null) {
      return error.message.message || error.message.error || JSON.stringify(error.message);
    }
    return "An unexpected error occurred";
  };

  const login = async (username, password) => {
    try {
      const result = await api.post("/auth/login", { username, password });

      setUser(result.data.user);
      setToken(result.data.token);
      localStorage.setItem("token", result.data.token);
      showNotification(`Welcome back, ${result.data.user.name || result.data.user.username}!`, "success");
      return { success: true };
    } catch (error) {
      showNotification(getErrorMessage(error), "danger");
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const register = async (username, email, password, name) => {
    try {
      const result = await api.post("/auth/register", { username, email, password, name });
      showNotification("Account created! You can now log in.", "success");
      return { success: true, data: result.data };
    } catch (error) {
      showNotification(getErrorMessage(error), "danger");
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  const getProfile = async () => {
    try {
      const result = await api.get("/auth/profile");
      setUser(result.data);
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const contextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {loading ? (
        <div className="vh-100 d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Validating Workspace Credentials...</span>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
