import { MessageSquare, Users, Wifi, WifiOff } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "./hooks/use_auth";
import { useWebSocket } from "./hooks/use_websocket";

/**
 * WebSocket Connection Test Component
 * Use this component to test your WebSocket connection before integrating with the full dashboard
 */
const WebSocketTest = () => {
  const [testProjectId, setTestProjectId] = useState("");
  const [messages, setMessages] = useState([]);
  const { token } = useAuth();

  const {
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
  } = useWebSocket(token);

  // Set up event handlers
  React.useEffect(() => {
    const addMessage = (message, type = "info") => {
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString(),
          },
        ].slice(-20)
      ); // Keep only last 20 messages
    };

    setOnTaskCreated((data) => {
      addMessage(
        `✅ Task Created: "${data.task.title}" by ${data.createdBy.username}`,
        "success"
      );
    });

    setOnTaskUpdated((data) => {
      addMessage(
        `📝 Task Updated: "${data.task.title}" by ${data.updatedBy.username}`,
        "info"
      );
    });

    setOnTaskDeleted((data) => {
      addMessage(
        `🗑️ Task Deleted: "${data.taskTitle}" by ${data.deletedBy.username}`,
        "warning"
      );
    });

    setOnUserJoined((data) => {
      addMessage(`👋 ${data.user.username} joined the project`, "user");
    });

    setOnUserLeft((data) => {
      addMessage(`👋 ${data.user.username} left the project`, "user");
    });
  }, [
    setOnTaskCreated,
    setOnTaskUpdated,
    setOnTaskDeleted,
    setOnUserJoined,
    setOnUserLeft,
  ]);

  const handleJoinProject = () => {
    if (testProjectId && !isNaN(testProjectId)) {
      joinProject(parseInt(testProjectId));
    }
  };

  const handleLeaveProject = () => {
    leaveProject();
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getBgColorForType = (type) => {
    switch (type) {
      case "success":
        return "bg-green-100 border-green-300";
      case "warning":
        return "bg-yellow-100 border-yellow-300";
      case "error":
        return "bg-red-100 border-red-300";
      case "user":
        return "bg-blue-100 border-blue-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">WebSocket Connection Test</h2>
        <p className="text-gray-600">
          Use this component to test your WebSocket connection and real-time
          events.
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-lg font-semibold mb-3">
                  Connection Status
                </h5>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isConnected
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <Wifi size={14} className="mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <WifiOff size={14} className="mr-1" />
                        Disconnected
                      </>
                    )}
                  </span>

                  {currentProject && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <Users size={14} className="mr-1" />
                      Project: {currentProject.projectName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {connectionError && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                <strong className="text-red-800">Connection Error:</strong>
                <span className="text-red-700 ml-1">{connectionError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Controls */}
      <div className="mb-6">
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4">
            <h5 className="text-lg font-semibold mb-4">
              Project Room Controls
            </h5>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project ID
              </label>
              <input
                type="number"
                placeholder="Enter project ID to join"
                value={testProjectId}
                onChange={(e) => setTestProjectId(e.target.value)}
                disabled={!isConnected}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter a valid project ID that you have access to
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleJoinProject}
                disabled={!isConnected || !testProjectId || currentProject}
                className="px-4 py-2 bg-blue-500 text-black rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <em>Join Project</em>
              </button>

              <button
                onClick={handleLeaveProject}
                disabled={!isConnected || !currentProject}
                className="px-4 py-2 bg-gray-500 text-black rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <em>Leave Project</em>
              </button>
            </div>

            {currentProject && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
                <strong className="text-green-800">
                  Currently in project:
                </strong>
                <span className="text-green-700 ml-1">
                  {currentProject.projectName} (ID: {currentProject.projectId})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Messages */}
      <div className="mb-6">
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-lg font-semibold flex items-center">
                <MessageSquare size={20} className="mr-2" />
                Real-time Events
              </h5>
              <button
                onClick={clearMessages}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Clear Messages
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="p-3 bg-blue-100 border border-blue-300 rounded">
                <p className="text-blue-800">
                  No messages yet. Join a project and perform some actions in
                  another tab/window to see real-time events.
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 border rounded ${getBgColorForType(
                      msg.type
                    )}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">{msg.message}</div>
                      <small className="text-gray-500 ml-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Testing Instructions */}
      <div>
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4">
            <h5 className="text-lg font-semibold mb-4">Testing Instructions</h5>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                Make sure your backend server is running on{" "}
                <code className="bg-gray-100 px-1 rounded">
                  http://localhost:5000
                </code>
              </li>
              <li>
                Verify you're authenticated (you should see "Connected" status
                above)
              </li>
              <li>Enter a valid project ID that you have access to</li>
              <li>Click "Join Project" to join the project room</li>
              <li>
                Open another browser tab/window and navigate to the same project
              </li>
              <li>In the other tab, create, update, or delete tasks</li>
              <li>
                You should see real-time events appear in the "Real-time Events"
                section below
              </li>
            </ol>

            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <p className="text-yellow-800">
                <strong>Note:</strong> Make sure you have at least one project
                created and some tasks to test with. The real-time events will
                only appear when actions are performed by other users or in
                other browser tabs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketTest;
