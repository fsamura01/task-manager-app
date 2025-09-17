import {
  ArrowLeft,
  Download,
  FileText,
  FolderOpen,
  Upload,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  Tab,
  Tabs,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import FileUploadComponent from "./file_upload_component.jsx";
import { useAuth } from "./hooks/use_auth";
import { useWebSocket } from "./hooks/use_websocket"; // Import the WebSocket hook
import TaskCreationForm from "./task_creation_form_component.jsx";
import TaskEditForm from "./task_edit_form_component.jsx";

const API_BASE_URL = `http://localhost:5000/api`;

const TasksDashboard = () => {
  // Core task management state
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Project context state
  const [projectInfo, setProjectInfo] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [projectFiles, setProjectFiles] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  // Real-time notifications
  const [notifications, setNotifications] = useState([]);
  const [activeUsers, setActiveUsers] = useState(new Set());

  const { token } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Initialize WebSocket connection
  const {
    isConnected,
    connectionError,
    //currentProject,
    setOnTaskCreated,
    setOnTaskUpdated,
    setOnTaskDeleted,
    setOnUserJoined,
    setOnUserLeft,
  } = useWebSocket(token, projectId);

  // Set up WebSocket event handlers
  useEffect(() => {
    // Handle real-time task creation
    setOnTaskCreated((data) => {
      setTasks((prevTasks) => {
        console.log("🚀 ~ TasksDashboard ~ prevTasks:", prevTasks);
        // Check if task already exists to prevent duplicates
        const exists = prevTasks.some((task) => task.id === data.task.id);
        if (!exists) {
          addNotification(
            `New task created: "${data.task.title}" by ${data.createdBy.username}`,
            "success"
          );
          return [data.task, ...prevTasks];
        }
        return prevTasks;
      });
    });

    // Handle real-time task updates
    setOnTaskUpdated((data) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === data.task.id ? data.task : task))
      );
      addNotification(
        `Task updated: "${data.task.title}" by ${data.updatedBy.username}`,
        "info"
      );
    });

    // Handle real-time task deletion
    setOnTaskDeleted((data) => {
      setTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== data.taskId)
      );
      addNotification(
        `Task deleted: "${data.taskTitle}" by ${data.deletedBy.username}`,
        "warning"
      );
    });

    // Handle user joining project
    setOnUserJoined((data) => {
      setActiveUsers((prev) => new Set(prev).add(data.user.username));
      addNotification(`${data.user.username} joined the project`, "info");
    });

    // Handle user leaving project
    setOnUserLeft((data) => {
      setActiveUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.user.username);
        return newSet;
      });
      addNotification(`${data.user.username} left the project`, "secondary");
    });
  }, [
    setOnTaskCreated,
    setOnTaskUpdated,
    setOnTaskDeleted,
    setOnUserJoined,
    setOnUserLeft,
  ]);

  // Add notification helper
  const addNotification = (message, variant = "info") => {
    const notification = {
      id: Date.now(),
      message,
      variant,
      timestamp: new Date(),
    };
    setNotifications((prev) => [notification, ...prev.slice(0, 4)]); // Keep only last 5

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  };

  // Fetch project information
  const fetchProjectInfo = async () => {
    try {
      setProjectLoading(true);
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.status}`);
      }

      const result = await response.json();
      setProjectInfo(result.data);
      setTasks(result.data.tasks);
    } catch (error) {
      console.error("Error fetching project:", error);
      setError(`Failed to load project information: ${error.message}`);
    } finally {
      setProjectLoading(false);
    }
  };

  // Fetch project files
  const fetchProjectFiles = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/files`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const result = await response.json();
      setProjectFiles(result.data.files || []);
    } catch (error) {
      console.error("Error fetching project files:", error);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectInfo();
      fetchProjectFiles();
    }
  }, [token, projectId]);

  // Task management handlers
  const handleTaskCreated = (newTask) => {
    if (projectId && newTask.project_id !== projectId) {
      console.warn("Task created but not associated with current project");
    }
    setTasks((prevTasks) => [newTask, ...prevTasks]);
  };

  const startEditing = (taskId) => {
    setEditingTaskId(taskId);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setEditingTaskId(null);
  };

  const handleEditCancel = () => {
    setEditingTaskId(null);
  };

  const toggleTaskCompletion = async (taskId) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...currentTask,
          completed: !currentTask.completed,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        );
      } else {
        throw new Error(data.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      setError("Failed to update task completion status");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setDeleteLoading(taskId);

      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setTasks((currentTasks) =>
          currentTasks.filter((task) => task.id !== taskId)
        );
      } else {
        throw new Error(data.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteClick = (task) => {
    const confirmMessage = `Are you sure you want to delete the task "${task.title}"?\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      deleteTask(task.id);
    }
  };

  const handleBackToProjects = () => {
    navigate("/projects");
  };

  // File handling
  const handleFilesUploaded = (uploadedFiles) => {
    console.log("Files uploaded:", uploadedFiles);
    setSuccessMessage(`${uploadedFiles.length} file(s) uploaded successfully!`);
    setTimeout(() => setSuccessMessage(""), 5000);
    fetchProjectFiles();
    setActiveTab("files");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      setError(`Failed to download ${fileName}`);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      setProjectFiles((prev) => prev.filter((file) => file.id !== fileId));
      setSuccessMessage("File deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete file");
    }
  };

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  // Loading state
  if (projectId && projectLoading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading tasks...</div>
        </div>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <Alert.Heading>Error Loading Tasks</Alert.Heading>
          <p>{error}</p>
          {projectId && (
            <Button variant="outline-primary" onClick={handleBackToProjects}>
              ← Back to Projects
            </Button>
          )}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Real-time notifications */}
      <ToastContainer position="top-end" className="p-3">
        {notifications.map((notification) => (
          <Toast key={notification.id} bg={notification.variant}>
            <Toast.Body className="text-white">
              {notification.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* Project Context Header */}
      {projectId && projectInfo && (
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Breadcrumb>
                  <Breadcrumb.Item
                    onClick={handleBackToProjects}
                    style={{ cursor: "pointer" }}
                    className="text-primary"
                  >
                    <FolderOpen size={16} className="me-1" />
                    Projects
                  </Breadcrumb.Item>
                  <Breadcrumb.Item active>{projectInfo.name}</Breadcrumb.Item>
                </Breadcrumb>

                <div className="d-flex align-items-center gap-3">
                  <h1 className="mb-1">{projectInfo.name} - Tasks</h1>

                  {/* Connection status indicator */}
                  <Badge
                    bg={isConnected ? "success" : "danger"}
                    className="d-flex align-items-center"
                  >
                    {isConnected ? (
                      <>
                        <Wifi size={14} className="me-1" />
                        Live
                      </>
                    ) : (
                      <>
                        <WifiOff size={14} className="me-1" />
                        Offline
                      </>
                    )}
                  </Badge>

                  {/* Active users indicator */}
                  {activeUsers.size > 0 && (
                    <Badge bg="info" className="d-flex align-items-center">
                      <Users size={14} className="me-1" />
                      {activeUsers.size} active
                    </Badge>
                  )}
                </div>

                {projectInfo.description && (
                  <p className="text-muted">{projectInfo.description}</p>
                )}

                {/* Connection error alert */}
                {connectionError && (
                  <Alert variant="warning" className="mt-2">
                    <small>WebSocket connection issue: {connectionError}</small>
                  </Alert>
                )}
              </div>

              <Button variant="outline-primary" onClick={handleBackToProjects}>
                <ArrowLeft size={16} className="me-1" />
                Back to Projects
              </Button>
            </div>
          </Col>
        </Row>
      )}

      {/* Success message */}
      {successMessage && (
        <Row className="mb-4">
          <Col>
            <Alert
              variant="success"
              dismissible
              onClose={() => setSuccessMessage("")}
            >
              {successMessage}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Task Creation Form */}
      <TaskCreationForm
        onTaskCreated={handleTaskCreated}
        projectId={projectId}
      />
      <hr />

      {/* Task Statistics Dashboard */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-light">
            <Card.Body>
              <Row className="text-center">
                <Col md={4}>
                  <Badge bg="primary" className="fs-6">
                    Total Tasks: {tasks.length}
                  </Badge>
                </Col>
                <Col md={4}>
                  <Badge bg="warning" className="fs-6">
                    Incomplete: {incompleteTasks.length}
                  </Badge>
                </Col>
                <Col md={4}>
                  <Badge bg="success" className="fs-6">
                    Completed: {completedTasks.length}
                  </Badge>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <hr />

      <Row className="mb-4">
        <Col>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab
              eventKey="tasks"
              title={
                <span>
                  <FolderOpen size={16} className="me-2" />
                  Tasks ({tasks.length})
                </span>
              }
            >
              {/* Tasks Display */}
              <Row>
                <Col>
                  {tasks.length === 0 ? (
                    <Card className="text-center py-4">
                      <Card.Body>
                        <Card.Text className="text-muted">
                          {projectId
                            ? `No tasks found for this project. Create your first task above!`
                            : `No tasks found. Create your first task above!`}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  ) : (
                    <div>
                      {tasks.map((task) => (
                        <Card
                          key={task.id}
                          className={`mb-3 ${
                            task.completed ? "bg-success-subtle" : ""
                          }`}
                        >
                          <Card.Body>
                            <Row className="align-items-start">
                              <Col md={8}>
                                <Card.Title
                                  className={`mb-2 ${
                                    task.completed
                                      ? "text-decoration-line-through text-muted"
                                      : ""
                                  }`}
                                >
                                  {task.title}
                                </Card.Title>
                                <Card.Text
                                  className={`mb-2 ${
                                    task.completed
                                      ? "text-decoration-line-through text-muted"
                                      : "text-secondary"
                                  }`}
                                >
                                  {task.description}
                                </Card.Text>
                                <div className="small text-muted">
                                  <span>
                                    Due:{" "}
                                    {new Date(
                                      task.due_date
                                    ).toLocaleDateString()}
                                  </span>
                                  {task.completed && (
                                    <Badge bg="success" className="ms-3">
                                      ✓ Completed
                                    </Badge>
                                  )}
                                </div>
                              </Col>

                              <Col md={4} className="text-end">
                                <ButtonGroup size="sm">
                                  <Button
                                    variant={
                                      task.completed ? "warning" : "success"
                                    }
                                    onClick={() =>
                                      toggleTaskCompletion(task.id)
                                    }
                                  >
                                    {task.completed
                                      ? "Mark Incomplete"
                                      : "Mark Complete"}
                                  </Button>

                                  <Button
                                    variant="primary"
                                    onClick={() => startEditing(task.id)}
                                    disabled={editingTaskId !== null}
                                  >
                                    Edit
                                  </Button>

                                  <Button
                                    variant="danger"
                                    onClick={() => handleDeleteClick(task)}
                                    disabled={deleteLoading === task.id}
                                  >
                                    {deleteLoading === task.id ? (
                                      <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                      />
                                    ) : (
                                      "Delete"
                                    )}
                                  </Button>
                                </ButtonGroup>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
            </Tab>

            <Tab
              eventKey="files"
              title={
                <span>
                  <FileText size={16} className="me-2" />
                  Files ({projectFiles.length})
                </span>
              }
            >
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Project Files</h5>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload size={16} className="me-2" />
                      Upload Files
                    </Button>
                  </div>

                  {projectFiles.length === 0 ? (
                    <div className="text-center py-5">
                      <FileText size={48} className="text-muted mb-3" />
                      <p className="text-muted">No files uploaded yet.</p>
                      <Button
                        variant="primary"
                        onClick={() => setActiveTab("upload")}
                      >
                        Upload Your First File
                      </Button>
                    </div>
                  ) : (
                    <div className="row">
                      {projectFiles.map((file) => (
                        <div key={file.id} className="col-md-6 col-lg-6 mb-3">
                          <Card className="h-100">
                            <Card.Body>
                              <div className="d-flex align-items-start justify-content-between">
                                <div className="flex-grow-1">
                                  <h6
                                    className="card-title text-truncate"
                                    title={file.filename}
                                  >
                                    {file.filename}
                                  </h6>
                                  <p className="card-text small text-muted mb-2">
                                    Size: {formatFileSize(file.file_size)}
                                    <br />
                                    Type: {file.mime_type}
                                    <br />
                                    Uploaded:{" "}
                                    {new Date(
                                      file.created_at
                                    ).toLocaleDateString()}
                                  </p>
                                  {file.task_title && (
                                    <Badge bg="secondary" className="mb-2">
                                      Task: {file.task_title}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() =>
                                    handleDownloadFile(file.id, file.filename)
                                  }
                                >
                                  <Download size={14} className="me-1" />
                                  Download
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteFile(file.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab
              eventKey="upload"
              title={
                <span>
                  <Upload size={16} className="me-2" />
                  Upload
                </span>
              }
            >
              <Card>
                <Card.Body>
                  <h5 className="mb-3">Upload Files to Project</h5>
                  <Alert variant="info" className="mb-4">
                    Upload files related to this project. Supported formats
                    include documents, images, and archives.
                  </Alert>
                  <FileUploadComponent
                    projectId={projectId}
                    tasks={tasks}
                    allowTaskSelection={true}
                    token={token}
                    onFilesUploaded={handleFilesUploaded}
                    maxFiles={10}
                    maxFileSize={10 * 1024 * 1024}
                    allowedTypes={[
                      "image/*",
                      "application/pdf",
                      ".doc",
                      ".docx",
                      ".txt",
                      ".zip",
                    ]}
                  />
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>

      {/* Task Edit Form */}
      {editingTaskId && (
        <Row className="mb-4">
          <Col>
            <TaskEditForm
              taskId={editingTaskId}
              onTaskUpdated={handleTaskUpdated}
              onCancel={handleEditCancel}
            />
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default TasksDashboard;
