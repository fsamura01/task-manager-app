import {
  ArrowLeft,
  Calendar,
  CircleCheck,
  CircleDashed,
  Download,
  Edit,
  FileText,
  FolderOpen,
  LayoutGrid,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  Tab,
  Tabs,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import FileUploadComponent from "../components/features/files/FileUpload";
import TaskCreationForm from "../components/features/tasks/TaskCreationForm";
import TaskEditForm from "../components/features/tasks/TaskEditForm";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../hooks/use_auth";
import { useWebSocket } from "../hooks/use_websocket";
import { api } from "../utils/api";

/**
 * Tasks Dashboard: The "Busy Hive"
 */
const TasksDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [projectFiles, setProjectFiles] = useState([]);
  const [activeUsers, setActiveUsers] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error("Simulated System Crash: ErrorBoundary Test Active.");
  }

  const { token } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const {
    isConnected,
    setOnTaskCreated,
    setOnTaskUpdated,
    setOnTaskDeleted,
    setOnUserJoined,
    setOnUserLeft,
  } = useWebSocket(token, projectId);

  useEffect(() => {
    setOnTaskCreated((data) => {
      setTasks((prevTasks) => {
        if (!prevTasks.some((t) => t.id === data.task.id)) {
          showNotification(`Activity: "${data.task.title}" was added!`, "success");
          return [data.task, ...prevTasks];
        }
        return prevTasks;
      });
    });

    setOnTaskUpdated((data) => {
      setTasks((prev) => prev.map((t) => t.id === data.task.id ? data.task : t));
      showNotification(`Change: "${data.task.title}" was updated.`, "info");
    });

    setOnTaskDeleted((data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
      showNotification(`Removed: ${data.taskTitle}`, "warning");
    });

    setOnUserJoined((data) => {
      setActiveUsers((prev) => new Set(prev).add(data.user.username));
      showNotification(`${data.user.username} entered the workspace`, "info");
    });

    setOnUserLeft((data) => {
      setActiveUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.user.username);
        return next;
      });
    });
  }, [setOnTaskCreated, setOnTaskUpdated, setOnTaskDeleted, setOnUserJoined, setOnUserLeft, showNotification]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchProjectInfo = useCallback(async (query = "") => {
    try {
      if (!query) setProjectLoading(true);
      else setIsSearching(true);

      const endpoint = `/projects/${projectId}${query ? `?search=${encodeURIComponent(query)}` : ""}`;
      const result = await api.get(endpoint);
      
      setProjectInfo(result.data);
      setTasks(result.data.tasks);
    } catch (error) {
      showNotification(error.message || "Could not load project details.", "danger");
    } finally {
      setProjectLoading(false);
      setIsSearching(false);
    }
  }, [projectId, showNotification]);

  const fetchProjectFiles = useCallback(async () => {
    try {
      const result = await api.get(`/projects/${projectId}/files`);
      setProjectFiles(result.data.files || []);
    } catch (error) {
       console.error("File sync failed", error);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectInfo(debouncedSearch);
      fetchProjectFiles();
    }
  }, [projectId, debouncedSearch, fetchProjectInfo, fetchProjectFiles]);

  const toggleTaskCompletion = async (taskId) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    try {
      const updatedTask = await api.put(`/tasks/${taskId}`, { 
        ...currentTask, 
        completed: !currentTask.completed 
      });
      
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updatedTask.data : task))
      );
      showNotification(
        `Task "${updatedTask.data.title}" marked as ${updatedTask.data.completed ? 'complete' : 'incomplete'}`, 
        "success"
      );
    } catch (error) {
      showNotification(error.message || "Failed to update task status.", "danger");
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this directive?")) return;
    
    try {
      setDeleteLoading(taskId);
      await api.delete(`/tasks/${taskId}`);
      setTasks((current) => current.filter((t) => t.id !== taskId));
      showNotification("Directive purged successfully", "success");
    } catch (error) {
      showNotification(error.message || "Failed to purge directive.", "danger");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const result = await api.get(`/files/${fileId}/download`);
      const downloadUrl = result.data.download_url;

      // Handle both relative and absolute URLs
      const absoluteUrl = downloadUrl.startsWith('http') 
        ? downloadUrl 
        : `${window.location.origin}${downloadUrl}`;

      const response = await fetch(absoluteUrl, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("File data retrieval failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showNotification(`Downloading ${fileName}`, "info");
    } catch (error) {
      showNotification(`Access denied: ${error.message}`, "danger");
    }
  };

  const deleteFile = async (fileId) => {
    if (!window.confirm("Delete this asset permanently?")) return;
    try {
      await api.delete(`/files/${fileId}`);
      setProjectFiles(prev => prev.filter(f => f.id !== fileId));
      showNotification("Asset deleted", "success");
    } catch (error) {
      showNotification(error.message || "Failed to delete file", "danger");
    }
  };

  if (projectLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="grow" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-5 fade-in">
      {/* Modern Breadcrumb & Project Header */}
      <div className="mb-5">
        <Breadcrumb className="mb-3 custom-breadcrumb">
          <Breadcrumb.Item onClick={() => navigate("/projects")} className="text-muted d-flex align-items-center gap-1">
            <LayoutGrid size={14} /> Workspaces
          </Breadcrumb.Item>
          <Breadcrumb.Item active className="fw-semibold">{projectInfo?.name}</Breadcrumb.Item>
        </Breadcrumb>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-4">
          <div className="d-flex align-items-center gap-4">
            <div className="p-3 bg-primary bg-opacity-10 rounded-4 text-primary">
              <FolderOpen size={32} />
            </div>
            <div>
              <h1 className="h2 mb-1 fw-bold">{projectInfo?.name}</h1>
              <div className="d-flex align-items-center gap-2">
                <Badge bg={isConnected ? "success" : "danger"} className="stats-badge rounded-pill bg-opacity-10 text-success border border-success border-opacity-25 px-2">
                  <span className={`d-inline-block rounded-circle me-1 ${isConnected ? 'bg-success' : 'bg-danger'}`} style={{ width: 8, height: 8 }}></span>
                  {isConnected ? "LIVE ENGINE" : "OFFLINE"}
                </Badge>
                {activeUsers.size > 0 && (
                  <Badge bg="primary" className="stats-badge rounded-pill bg-opacity-10 text-primary border border-primary border-opacity-25 px-2">
                    <Users size={12} className="me-1" /> {activeUsers.size} COLLABORATORS
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" size="sm" onClick={() => setShouldCrash(true)} className="me-2 opacity-50 hover-opacity-100">
                Test Crash
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)} className="d-flex align-items-center gap-2 px-4 shadow-sm">
                <Plus size={20} /> Deploy Directive
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate("/projects")} className="btn-icon-text">
                <ArrowLeft size={16} /> Back
            </Button>
          </div>
        </div>
      </div>

      <TaskCreationForm 
        show={showCreateModal} 
        onHide={() => setShowCreateModal(false)}
        onTaskCreated={(task) => setTasks([task, ...tasks])} 
        projectId={projectId} 
      />

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-5 premium-tabs glass p-1 rounded-4 border-0">
        <Tab eventKey="tasks" title={
          <div className="d-flex align-items-center gap-2 py-2 px-3">
            <CircleDashed size={18} /> <span>Mission Tasks ({tasks.length})</span>
          </div>
        }>
          <div className="py-4">
            {/* Search Bar */}
            <div className="search-container mb-4 glass rounded-4 p-2 shadow-sm border border-light border-opacity-10">
              <div className="position-relative">
                <div className="position-absolute h-100 d-flex align-items-center ps-3 text-muted">
                  {isSearching ? <Spinner animation="border" size="sm" variant="primary" /> : <Search size={20} />}
                </div>
                <input
                  type="text"
                  className="form-control form-control-lg bg-transparent border-0 ps-5 py-3 shadow-none custom-search-input"
                  placeholder="Search directives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {tasks.length === 0 ? (
              <Card className="border-0 shadow-premium text-center py-5 rounded-4">
                <Card.Body>
                  <CircleDashed size={48} className="text-muted opacity-25 mb-3" />
                  <h4 className="text-muted">{searchTerm ? "No results" : "Empty log"}</h4>
                </Card.Body>
              </Card>
            ) : (
              <Row>
                {tasks.map((task) => (
                  <Col md={12} key={task.id} className="mb-3">
                    <Card className={`task-card border-0 shadow-sm rounded-4 transition-all ${task.completed ? 'opacity-75' : ''}`}>
                      <Card.Body className="p-4">
                        <Row className="align-items-center">
                          <Col className="d-flex align-items-center gap-3">
                            <div 
                              onClick={() => toggleTaskCompletion(task.id)}
                              className={`cursor-pointer transition-all rounded-circle p-2 ${task.completed ? 'bg-success text-white' : 'bg-light text-muted hover-bg-light'}`}
                              style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: task.completed ? 'none' : '2px dashed #E2E8F0' }}
                            >
                              <CircleCheck size={24} />
                            </div>
                            <div className="flex-grow-1">
                              <h5 className={`mb-1 fw-bold ${task.completed ? 'text-decoration-line-through text-muted' : ''}`}>
                                {task.title}
                              </h5>
                              <p className="text-muted small mb-0 d-flex align-items-center gap-1">
                                <Calendar size={14} /> Due {new Date(task.due_date).toLocaleDateString()}
                              </p>
                            </div>
                          </Col>
                          <Col md="auto" className="d-flex gap-2">
                            <Button variant="light" size="sm" onClick={() => setEditingTaskId(task.id)} className="btn-icon border">
                              <Edit size={16} />
                            </Button>
                            <Button variant="light" size="sm" onClick={() => deleteTask(task.id)} className="btn-icon border text-danger" disabled={deleteLoading === task.id}>
                              {deleteLoading === task.id ? <Spinner animation="border" size="sm" /> : <Trash2 size={16} />}
                            </Button>
                          </Col>
                        </Row>
                        {task.description && (
                            <div className="mt-3 pt-3 border-top">
                                <p className="text-muted small mb-0">{task.description}</p>
                            </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </Tab>
        
        <Tab eventKey="files" title={
          <div className="d-flex align-items-center gap-2 py-2 px-3">
            <FileText size={18} /> <span>Assets ({projectFiles.length})</span>
          </div>
        }>
          <div className="py-4">
            <Row>
              <Col md={12} className="mb-4">
                <FileUploadComponent projectId={projectId} onFileUploaded={fetchProjectFiles} />
              </Col>
              {projectFiles.map((file) => (
                <Col md={4} key={file.id} className="mb-4">
                  <Card className="border-0 shadow-sm rounded-4 h-100">
                    <Card.Body className="p-4 d-flex flex-column">
                      <div className="p-3 bg-light rounded-3 mb-3 text-center">
                        <FileText size={32} className="text-primary" />
                      </div>
                      <h6 className="fw-bold text-truncate mb-2">{file.filename}</h6>
                      <div className="d-flex gap-2 mt-auto pt-3 border-top">
                        <Button variant="primary" size="sm" className="flex-grow-1" onClick={() => handleDownload(file.id, file.filename)}>
                          <Download size={14} className="me-1" /> Access
                        </Button>
                        <Button variant="light" size="sm" className="text-danger" onClick={() => deleteFile(file.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </Tab>
      </Tabs>

      {editingTaskId && (
        <TaskEditForm 
          taskId={editingTaskId} 
          onTaskUpdated={(t) => {
            setTasks(tasks.map(orig => orig.id === t.id ? t : orig));
            setEditingTaskId(null);
            showNotification("Directive updated", "success");
          }}
          onCancel={() => setEditingTaskId(null)}
        />
      )}
    </Container>
  );
};

export default TasksDashboard;
