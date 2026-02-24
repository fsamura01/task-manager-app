import { createContext, useContext } from "react"; // Authentication Context

export const AuthContext = createContext();

// Custom hook to use auth context

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
