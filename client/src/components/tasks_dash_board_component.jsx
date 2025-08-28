import {
  ArrowLeft,
  Download,
  FileText,
  FolderOpen,
  Upload,
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
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import FileUploadComponent from "./file_upload_component.jsx";
import { useAuth } from "./hooks/use_auth";
import TaskCreationForm from "./task_creation_form_component.jsx";
import TaskEditForm from "./task_edit_form_component.jsx";

const API_BASE_URL = `http://localhost:5000/api`;

/**
 * Enhanced TasksDashboard Component with project scoping
 *
 * This component handles task management within the context of a specific project.
 * It demonstrates several key React patterns:
 * - URL parameter extraction for project scoping
 * - Conditional rendering based on project context
 * - Breadcrumb navigation for user orientation
 * - Optimistic UI updates for better user experience
 */
const TasksDashboard = () => {
  // Core task management state
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Project context state - helps provide navigation context
  const [projectInfo, setProjectInfo] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [projectFiles, setProjectFiles] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [successMessage, setSuccessMessage] = useState("");

  const { token } = useAuth();

  // Extract projectId from URL parameters - this is how we know which project we're viewing
  const { projectId } = useParams();

  // Navigation function to go back to projects
  const navigate = useNavigate();

  /**
   * Fetch project information to provide context
   * This helps users understand which project they're working in
   */
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

  // Add this function after your existing fetch functions
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
      // Don't set error state for files - just log it
    }
  };

  /**
   * Load both project info and tasks when component mounts or projectId changes
   * This dual loading ensures we have both context and content
   */
  useEffect(() => {
    if (projectId) {
      fetchProjectInfo();
      fetchProjectFiles(); // Add this line
    }
    //fetchTasks();
  }, [token, projectId]);

  /**
   * Handle new task creation
   * When a task is created, we add it to our local state for immediate feedback
   */
  const handleTaskCreated = (newTask) => {
    // Validate that the task belongs to the current project
    if (projectId && newTask.project_id !== projectId) {
      console.warn("Task created but not associated with current project");
    }
    // Add to the beginning of the array for immediate visibility
    setTasks((prevTasks) => [newTask, ...prevTasks]);
  };

  /**
   * Task editing workflow
   * We use a simple state flag to control which task is being edited
   */
  const startEditing = (taskId) => {
    setEditingTaskId(taskId);
  };

  const handleTaskUpdated = (updatedTask) => {
    // Update the task in our local state
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setEditingTaskId(null);
    console.log("Task updated successfully:", updatedTask.title);
  };

  const handleEditCancel = () => {
    setEditingTaskId(null);
  };

  /**
   * Toggle task completion status
   * This provides immediate feedback while the API call completes
   */
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
        // Update local state with the new completion status
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

  /**
   * Delete a task with loading state
   * We track which task is being deleted to provide specific loading feedback
   */
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
        // Remove the task from local state
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

  /**
   * Handle delete confirmation
   * We use a confirm dialog to prevent accidental deletions
   */
  const handleDeleteClick = (task) => {
    const confirmMessage = `Are you sure you want to delete the task "${task.title}"?\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      deleteTask(task.id);
    }
  };

  /**
   * Navigation helper
   * This takes users back to the projects overview
   */
  const handleBackToProjects = () => {
    navigate("/projects");
  };

  // File Upload Handler
  const handleFilesUploaded = (uploadedFiles) => {
    console.log("Files uploaded:", uploadedFiles);

    // Show success message
    setSuccessMessage(`${uploadedFiles.length} file(s) uploaded successfully!`);
    setTimeout(() => setSuccessMessage(""), 5000);

    // Refresh files list if you have an API endpoint
    fetchProjectFiles();

    // Switch to files tab
    setActiveTab("files");
  };

  // Calculate task statistics for the dashboard
  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  // Loading state - show while fetching data
  if (projectId && projectLoading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <div className="mt-2">{projectLoading && "Loading tasks"}</div>
        </div>
      </Container>
    );
  }

  // Error state with contextual actions
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

  // Add these helper functions to your component:
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

      // Remove from local state
      setProjectFiles((prev) => prev.filter((file) => file.id !== fileId));
      setSuccessMessage("File deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete file");
    }
  };

  return (
    <Container className="py-4">
      {/* Project Context Header - only show when we're in a project */}
      {projectId && projectInfo && (
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                {/* Breadcrumb navigation for user orientation */}
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

                <h1 className="mb-1">{projectInfo.name} - Tasks</h1>
                {projectInfo.description && (
                  <p className="text-muted">{projectInfo.description}</p>
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

      {/* Task Creation Form - pass projectId for automatic association */}
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
              {/* Your existing task content goes here */}
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
              {/* Upload interface */}
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

      {/* Task Edit Form - conditionally rendered based on editing state */}
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
