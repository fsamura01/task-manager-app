import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

/**
 * Custom hook for managing WebSocket connections for task management
 * Handles authentication, project rooms, and real-time task updates
 */
export const useWebSocket = (token, projectId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  // Use ref to track callbacks to avoid stale closures
  const onTaskCreatedRef = useRef(null);
  const onTaskUpdatedRef = useRef(null);
  const onTaskDeletedRef = useRef(null);
  const onUserJoinedRef = useRef(null);
  const onUserLeftRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // If we don't have a token (keycard), we can't even try to connect.
    if (!token) return;

    console.log("Attempting to open the 'Walkie-Talkie' channel (WebSocket)...");

    /**
     * Step 1: Initialize the Socket Instance
     * Think of this as dialing the server's phone number.
     */
    const socketInstance = io("http://localhost:5000", {
      auth: { token }, // Include our keycard in the initial handshake
      transports: ["websocket", "polling"], // Try fast way first, then fallback
      reconnectionAttempts: 5,
    });

    // Handle Connection Success
    socketInstance.on("connect", () => {
      console.log("✅ WebSocket Connected! ID:", socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    // Handle Disconnection
    socketInstance.on("disconnect", (reason) => {
      console.log("❌ WebSocket Disconnected. Reason:", reason);
      setIsConnected(false);
      setCurrentProject(null);
    });

    // Handle Connection Errors (e.g. Server is down or CORS blocked us)
    socketInstance.on("connect_error", (error) => {
      console.error("⚠️ Connection Error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Set the instance to state so other parts of the app can use it
    setSocket(socketInstance);

    /**
     * CLEANUP: The "Goodbye" function
     * Junior Note: React might run this effect twice in development (Strict Mode).
     * The error "WebSocket is closed before the connection is established" usually 
     * happens because React opened the connection and closed it so fast that the 
     * server didn't even have time to say "Hello" back. 
     * You can usually ignore this error in development!
     */
    return () => {
      console.log("Closing 'Walkie-Talkie' channel...");
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [token]);

  /* Step 3: Client Sends Join Project Event */
  // Join project when projectId changes
  useEffect(() => {
    if (socket && isConnected && projectId) {
      console.log("Joining project:", projectId);
      socket.emit("join_project", parseInt(projectId));
    }
  }, [socket, isConnected, projectId]);

  // Helper functions to set event callbacks
  const setOnTaskCreated = (callback) => {
    onTaskCreatedRef.current = callback;
  };

  const setOnTaskUpdated = (callback) => {
    onTaskUpdatedRef.current = callback;
  };

  const setOnTaskDeleted = (callback) => {
    onTaskDeletedRef.current = callback;
  };

  const setOnUserJoined = (callback) => {
    onUserJoinedRef.current = callback;
  };

  const setOnUserLeft = (callback) => {
    onUserLeftRef.current = callback;
  };

  // Manual project controls
  const joinProject = (projectId) => {
    if (socket && isConnected) {
      socket.emit("join_project", parseInt(projectId));
    }
  };

  const leaveProject = () => {
    if (socket && isConnected) {
      socket.emit("leave_project");
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    currentProject,
    joinProject,
    leaveProject,
    setOnTaskCreated,
    setOnTaskUpdated,
    setOnTaskDeleted,
    setOnUserJoined,
    setOnUserLeft,
  };
};
