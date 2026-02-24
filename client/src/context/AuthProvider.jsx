import { useEffect, useState } from "react";
import { AuthContext } from "../hooks/use_auth";
import { api } from "../utils/api";

/**
 * Authentication Context Provider
 */
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const login = async (username, password) => {
    try {
      const result = await api.post("/auth/login", { username, password });

      setUser(result.data.user);
      setToken(result.data.token);
      localStorage.setItem("token", result.data.token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (username, email, password, name) => {
    try {
      const result = await api.post("/auth/register", { username, email, password, name });
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error.message };
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
