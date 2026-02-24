import { Info, MessageSquare, Trash2, Users, Wifi, WifiOff } from "lucide-react";
import React, { useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { useAuth } from "../hooks/use_auth";
import { useWebSocket } from "../hooks/use_websocket";

/**
 * WebSocket Connectivity Tester
 * 
 * A diagnostic component for verifying real-time WebSocket communication.
 * 
 * Flow:
 * 1. Connects to the WebSocket server using the auth token.
 * 2. Allows manual joining/leaving of project rooms by ID.
 * 3. Listens for and logs real-time events: Task Created, Updated, Deleted, User Joined/Left.
 * 4. Displays connection status and a log of received messages for debugging.
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

  const getVariantForType = (type) => {
    switch (type) {
      case "success": return "success";
      case "warning": return "warning";
      case "error": return "danger";
      case "user": return "primary";
      default: return "secondary";
    }
  };

  return (
    <Container className="py-5">
      <div className="mb-5 fade-in-up">
        <h2 className="fw-bold mb-2">WebSocket Connection Test</h2>
        <p className="text-muted">
          Use this component to test your WebSocket connection and real-time events.
        </p>
      </div>

      <Row className="g-4">
        {/* Connection Status */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold mb-0">Connection Status</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between">
                   <span className="text-muted">Status</span>
                   <Badge bg={isConnected ? "success" : "danger"} className="px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                      {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                      {isConnected ? "Connected" : "Disconnected"}
                   </Badge>
                </div>
                
                 {currentProject && (
                    <div className="p-3 bg-primary bg-opacity-10 rounded text-primary border border-primary border-opacity-25">
                      <small className="d-block fw-bold text-uppercase mb-1" style={{ fontSize: '0.7rem' }}>Active Project</small>
                      <div className="d-flex align-items-center gap-2 fw-medium">
                         <Users size={16} /> {currentProject.projectName} <span className="opacity-50">(ID: {currentProject.projectId})</span>
                      </div>
                    </div>
                  )}

                  {connectionError && (
                    <Alert variant="danger" className="mb-0">
                      <strong>Connection Error:</strong> {connectionError}
                    </Alert>
                  )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Project Controls */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold mb-0">Project Controls</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted">PROJECT ID</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter project ID to join..."
                  value={testProjectId}
                  onChange={(e) => setTestProjectId(e.target.value)}
                  disabled={!isConnected}
                  className="search-input-premium"
                />
                <Form.Text className="text-muted">Enter a valid project ID that you have access to.</Form.Text>
              </Form.Group>

              <div className="d-flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleJoinProject}
                  disabled={!isConnected || !testProjectId || currentProject}
                  className="px-4"
                >
                  Join Project Room
                </Button>

                <Button
                  variant="outline-secondary"
                  onClick={handleLeaveProject}
                  disabled={!isConnected || !currentProject}
                  className="px-4"
                >
                  Leave Project
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Real-time Messages */}
        <Col xs={12}>
          <Card className="border-0 shadow-premium glass">
             <Card.Header className="bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <MessageSquare size={20} className="text-primary" /> Real-time Events
              </h5>
              <Button variant="link" size="sm" onClick={clearMessages} className="text-muted text-decoration-none">
                <Trash2 size={16} /> Clear
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
               {messages.length === 0 ? (
                <div className="text-center py-5 text-muted border rounded-3 bg-light bg-opacity-50">
                   <div className="mb-3">
                      <MessageSquare size={32} className="opacity-25" />
                   </div>
                   <p className="mb-0">No messages yet.</p>
                   <small>Join a project and perform actions to see events stream here.</small>
                </div>
              ) : (
                <div className="overflow-auto border rounded-3 bg-white" style={{ maxHeight: '400px' }}>
                  {messages.slice().reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 border-bottom d-flex align-items-start gap-3 border-start border-4 border-start-${getVariantForType(msg.type)}`}
                    >
                      <div className="flex-grow-1">
                         <div className="d-flex justify-content-between align-items-center mb-1">
                            <Badge bg={getVariantForType(msg.type)} className="text-uppercase" style={{ fontSize: '0.65rem' }}>{msg.type}</Badge>
                            <small className="text-muted mono">{new Date(msg.timestamp).toLocaleTimeString()}</small>
                         </div>
                         <div className="text-dark small">{msg.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        {/* Testing Instructions */}
        <Col xs={12}>
          <Alert variant="info" className="border-0 shadow-sm">
             <div className="d-flex gap-3">
                <Info size={24} className="mt-1" />
                <div>
                   <h6 className="fw-bold alert-heading">How to Test</h6>
                    <ol className="mb-0 ps-3 small">
                      <li>Make sure backend is running on localhost:5000.</li>
                      <li>Authenticate so connection status shows "Connected".</li>
                      <li>Enter a Project ID and click "Join".</li>
                      <li>Open another tab, navigate to the same project, and make changes (create/edit tasks).</li>
                      <li>Observe real-time events appearing in the log above.</li>
                    </ol>
                </div>
             </div>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default WebSocketTest;
