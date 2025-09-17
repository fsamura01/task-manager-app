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
    if (!token) return;

    console.log("Initializing WebSocket connection...");

    /* Step 1: WebSocket Connection Establishment */
    const socketInstance = io("http://localhost:5000", {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
    });

    /* Step 2: Connection Success */
    // Connection event handlers
    socketInstance.on("connect", () => {
      console.log("WebSocket connected:", socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setIsConnected(false);
      setCurrentProject(null);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    /* Step 4: Server Responds with Confirmation */
    // Project room events
    socketInstance.on("joined_project", (data) => {
      console.log("Successfully joined project:", data);
      setCurrentProject(data);
    });

    socketInstance.on("left_project", (data) => {
      console.log("Left project:", data);
      setCurrentProject(null);
    });

    // Real-time task events
    socketInstance.on("task_created", (data) => {
      console.log("Task created by another user:", data);
      if (onTaskCreatedRef.current) {
        onTaskCreatedRef.current(data);
      }
    });

    socketInstance.on("task_updated", (data) => {
      console.log("Task updated by another user:", data);
      if (onTaskUpdatedRef.current) {
        onTaskUpdatedRef.current(data);
      }
    });

    socketInstance.on("task_deleted", (data) => {
      console.log("Task deleted by another user:", data);
      if (onTaskDeletedRef.current) {
        onTaskDeletedRef.current(data);
      }
    });

    // User presence events
    socketInstance.on("user_joined_project", (data) => {
      console.log("🚀 ~ useWebSocket ~ data:", data);
      console.log("User joined project:", data.user.username);
      if (onUserJoinedRef.current) {
        onUserJoinedRef.current(data);
      }
    });

    socketInstance.on("user_left_project", (data) => {
      console.log("User left project:", data.user.username);
      if (onUserLeftRef.current) {
        onUserLeftRef.current(data);
      }
    });

    // Error handling
    socketInstance.on("error", (error) => {
      console.error("WebSocket error:", error.message);
      setConnectionError(error.message);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up WebSocket connection");
      socketInstance.disconnect();
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
