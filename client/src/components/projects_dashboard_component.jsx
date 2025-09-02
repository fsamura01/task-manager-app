import {
  ArrowRight,
  ArrowRight,
  Calendar,
  Calendar,
  CheckCircle,
  CheckCircle,
  Edit,
  Edit,
  FolderOpen,
  FolderOpen,
  Plus,
  Plus,
  Trash2,
  Trash2,
  Upload,
  Upload,
  X,
  X,
} from "lucide-react";
import { default as React, default as React, useEffect, useEffect, useState, useState } from "react";
import {
  Alert,
  Alert,
  Badge,
  Badge,
  Button,
  Button,
  Card,
  Card,
  Col,
  Col,
  Collapse,
  Collapse,
  Container,
  Container,
  Form,
  Form,
  Modal,
  Modal,
  ProgressBar,
  ProgressBar,
  Row,
  Row,
  Spinner,
  Spinner,
} from "react-bootstrap";
import { useNavigate, useNavigate } from "react-router-dom";
import { default as FileUploadComponent, default as FileUploadComponent } from "./file_upload_component"; // Your file upload component
import { useAuth, useAuth } from "./hooks/use_auth";

const API_BASE_URL = "http://localhost:5000/api";

const ProjectsDashboard = () => {
  const [projects, setProjects] = useState([]);
  console.log("🚀 ~ ProjectsDashboard ~ projects:", projects);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // File upload state
  const [expandedUpload, setExpandedUpload] = useState({}); // Track which project's upload is expanded

  const { token } = useAuth();
  const navigate = useNavigate();

  // Fetch all projects when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/projects/with-tasks`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }

        const result = await response.json();
        setProjects(result.data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [token]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setProjects((prev) => [result.data, ...prev]);
        setShowCreateModal(false);
        setFormData({ name: "", description: "" });
        setSuccessMessage("Project created successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${editingProject.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (result.success) {
        setProjects((prev) =>
          prev.map((project) =>
            project.id === editingProject.id ? result.data : project
          )
        );
        setShowEditModal(false);
        setEditingProject(null);
        setFormData({ name: "", description: "" });
        setSuccessMessage("Project updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      setError("Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    const confirmMessage = `Are you sure you want to delete "${projectName}"? This will also delete all tasks in this project. This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (result.success) {
          setProjects((prev) =>
            prev.filter((project) => project.id !== projectId)
          );
          setSuccessMessage("Project deleted successfully!");
          setTimeout(() => setSuccessMessage(""), 3000);
        } else {
          setError(result.error);
        }
      } catch (error) {
        console.error("Error deleting project:", error);
        setError("Failed to delete project");
      }
    }
  };

  // File upload handlers
  const toggleUploadSection = (projectId) => {
    setExpandedUpload((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Also, you might want to update your handleFilesUploaded function to handle task associations:
  const handleFilesUploaded = (
    projectId,
    uploadedFiles,
    eventType = "upload"
  ) => {
    console.log(`Files uploaded to project ${projectId}:`, uploadedFiles);
    console.log("Event type:", eventType);

    if (eventType === "upload") {
      // Show success message with task information if available
      const taskInfo = uploadedFiles.some((file) => file.task_id)
        ? " and associated with selected tasks"
        : "";

      setSuccessMessage(
        `${uploadedFiles.length} file(s) uploaded successfully to project${taskInfo}!`
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      // Close the upload section
      setExpandedUpload((prev) => ({ ...prev, [projectId]: false }));

      // Optional: Refresh project data to get updated file counts
      // You could add a fetchProjects() call here if your API returns file counts
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", description: "" });
    setShowCreateModal(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setFormData({ name: project.name, description: project.description || "" });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingProject(null);
    setFormData({ name: "", description: "" });
    setError(null);
  };

  const calculateProgress = (completed, total) => {
    if (parseInt(total) === 0) return 0;
    return Math.floor((completed / total) * 100);
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}/tasks`);
  };

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="text-center">
          <Spinner animation="border" />
          <div className="mt-2">Loading projects...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-1">My Projects</h1>
              <p className="text-muted">
                Organize your tasks into meaningful projects
              </p>
            </div>
            <Button
              variant="primary"
              onClick={openCreateModal}
              className="d-flex align-items-center gap-2"
            >
              <Plus size={16} />
              New Project
            </Button>
          </div>
        </Col>
      </Row>

      {/* Success Message */}
      {successMessage && (
        <Alert
          variant="success"
          onClose={() => setSuccessMessage("")}
          dismissible
        >
          {successMessage}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Projects Grid */}
      <Row>
        {projects.length === 0 ? (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <FolderOpen size={48} className="text-muted mb-3" />
                <Card.Title className="text-muted">No Projects Yet</Card.Title>
                <Card.Text className="text-muted">
                  Create your first project to start organizing your tasks
                </Card.Text>
                <Button variant="primary" onClick={openCreateModal}>
                  Create Project
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          projects.map((project) => {
            const progress = calculateProgress(
              project.statistics.completed_tasks,
              project.statistics.total_tasks
            );
            const isCompleted =
              project.statistics.total_tasks > 0 &&
              project.statistics.completed_tasks ===
                project.statistics.total_tasks;

            return (
              <Col md={6} lg={6} key={project.id} className="mb-4">
                <Card
                  className={`h-100 ${isCompleted ? "border-success" : ""}`}
                >
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title className="mb-1">{project.name}</Card.Title>
                      {isCompleted && (
                        <Badge bg="success" className="ms-2">
                          <CheckCircle size={12} className="me-1" />
                          Complete
                        </Badge>
                      )}
                    </div>
                    <Card.Text className="text-muted flex-grow-1">
                      {project.description || "No description provided"}
                    </Card.Text>
                    {/* Progress Section */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Progress</small>
                        <small className="text-muted">
                          {project.statistics.completed_tasks}/
                          {project.statistics.total_tasks} tasks
                        </small>
                      </div>
                      <ProgressBar
                        now={progress}
                        variant={isCompleted ? "success" : "primary"}
                        className="mb-1"
                      />
                      <div className="text-center">
                        <small className="text-muted">
                          {progress}% complete
                        </small>
                      </div>
                    </div>
                    {/* Project Stats */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex gap-2">
                        <Badge
                          bg="primary"
                          className="d-flex align-items-center gap-1"
                        >
                          <Calendar size={12} />
                          {project.statistics.total_tasks} tasks
                        </Badge>
                        {project.statistics.completed_tasks > 0 && (
                          <Badge
                            bg="success"
                            className="d-flex align-items-center gap-1"
                          >
                            <CheckCircle size={12} />
                            {project.completed_count} done
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted">
                        Created{" "}
                        {new Date(project.created_at).toLocaleDateString()}
                      </small>
                    </div>

                    <Collapse in={expandedUpload[project.id]}>
                      <div className="border-top pt-3 mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">
                            <Upload size={16} className="me-2" />
                            Upload Project Files
                          </h6>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => toggleUploadSection(project.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        <FileUploadComponent
                          key={project.id}
                          projectId={project.id}
                          tasks={project.tasks || []} // Pass the tasks array
                          allowTaskSelection={true} // Enable task selection
                          token={token}
                          onFilesUploaded={(files) =>
                            handleFilesUploaded(project.id, files)
                          }
                          maxFiles={5}
                          maxFileSize={10 * 1024 * 1024} // 10MB
                          allowedTypes={[
                            "image/*",
                            "application/pdf",
                            ".doc",
                            ".docx",
                            ".txt",
                            ".md",
                            ".zip",
                            ".rar",
                            ".png",
                            ".jpg",
                          ]}
                        />
                        ;
                      </div>
                    </Collapse>
                    {/* Action Buttons */}
                    <div className="d-flex gap-2 mt-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewProject(project.id)}
                        className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                      >
                        View Tasks
                        <ArrowRight size={14} />
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => toggleUploadSection(project.id)}
                        title="Upload Files"
                      >
                        <Upload size={14} />
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => openEditModal(project)}
                        title="Edit Project"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() =>
                          handleDeleteProject(project.id, project.name)
                        }
                        title="Delete Project"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })
        )}
      </Row>

      {/* Create Project Modal */}
      <Modal show={showCreateModal} onHide={closeModals}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateProject}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter project name"
                required
                minLength={3}
                maxLength={200}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your project (optional)"
                maxLength={500}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? <Spinner size="sm" /> : "Create Project"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal show={showEditModal} onHide={closeModals}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditProject}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter project name"
                required
                minLength={3}
                maxLength={200}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your project (optional)"
                maxLength={500}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? <Spinner size="sm" /> : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProjectsDashboard;

const API_BASE_URL = "http://localhost:5000/api";

const ProjectsDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // File upload state
  const [expandedUpload, setExpandedUpload] = useState({}); // Track which project's upload is expanded

  const { token } = useAuth();
  const navigate = useNavigate();

  // Fetch all projects when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/projects/with-tasks`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }

        const result = await response.json();
        setProjects(result.data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [token]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setProjects((prev) => [result.data, ...prev]);
        setShowCreateModal(false);
        setFormData({ name: "", description: "" });
        setSuccessMessage("Project created successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${editingProject.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (result.success) {
        setProjects((prev) =>
          prev.map((project) =>
            project.id === editingProject.id ? result.data : project
          )
        );
        setShowEditModal(false);
        setEditingProject(null);
        setFormData({ name: "", description: "" });
        setSuccessMessage("Project updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      setError("Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    const confirmMessage = `Are you sure you want to delete "${projectName}"? This will also delete all tasks in this project. This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (result.success) {
          setProjects((prev) =>
            prev.filter((project) => project.id !== projectId)
          );
          setSuccessMessage("Project deleted successfully!");
          setTimeout(() => setSuccessMessage(""), 3000);
        } else {
          setError(result.error);
        }
      } catch (error) {
        console.error("Error deleting project:", error);
        setError("Failed to delete project");
      }
    }
  };

  // File upload handlers
  const toggleUploadSection = (projectId) => {
    setExpandedUpload((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Also, you might want to update your handleFilesUploaded function to handle task associations:
  const handleFilesUploaded = (
    projectId,
    uploadedFiles,
    eventType = "upload"
  ) => {
    console.log(`Files uploaded to project ${projectId}:`, uploadedFiles);
    console.log("Event type:", eventType);

    if (eventType === "upload") {
      // Show success message with task information if available
      const taskInfo = uploadedFiles.some((file) => file.task_id)
        ? " and associated with selected tasks"
        : "";

      setSuccessMessage(
        `${uploadedFiles.length} file(s) uploaded successfully to project${taskInfo}!`
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      // Close the upload section
      setExpandedUpload((prev) => ({ ...prev, [projectId]: false }));

      // Optional: Refresh project data to get updated file counts
      // You could add a fetchProjects() call here if your API returns file counts
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", description: "" });
    setShowCreateModal(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setFormData({ name: project.name, description: project.description || "" });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingProject(null);
    setFormData({ name: "", description: "" });
    setError(null);
  };

  const calculateProgress = (completed, total) => {
    if (parseInt(total) === 0) return 0;
    return Math.floor((completed / total) * 100);
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}/tasks`);
  };

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="text-center">
          <Spinner animation="border" />
          <div className="mt-2">Loading projects...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-1">My Projects</h1>
              <p className="text-muted">
                Organize your tasks into meaningful projects
              </p>
            </div>
            <Button
              variant="primary"
              onClick={openCreateModal}
              className="d-flex align-items-center gap-2"
            >
              <Plus size={16} />
              New Project
            </Button>
          </div>
        </Col>
      </Row>

      {/* Success Message */}
      {successMessage && (
        <Alert
          variant="success"
          onClose={() => setSuccessMessage("")}
          dismissible
        >
          {successMessage}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Projects Grid */}
      <Row>
        {projects.length === 0 ? (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <FolderOpen size={48} className="text-muted mb-3" />
                <Card.Title className="text-muted">No Projects Yet</Card.Title>
                <Card.Text className="text-muted">
                  Create your first project to start organizing your tasks
                </Card.Text>
                <Button variant="primary" onClick={openCreateModal}>
                  Create Project
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          projects.map((project) => {
            const progress = calculateProgress(
              project.statistics.completed_tasks,
              project.statistics.total_tasks
            );
            const isCompleted =
              project.statistics.total_tasks > 0 &&
              project.statistics.completed_tasks ===
                project.statistics.total_tasks;

            return (
              <Col md={6} lg={6} key={project.id} className="mb-4">
                <Card
                  className={`h-100 ${isCompleted ? "border-success" : ""}`}
                >
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title className="mb-1">{project.name}</Card.Title>
                      {isCompleted && (
                        <Badge bg="success" className="ms-2">
                          <CheckCircle size={12} className="me-1" />
                          Complete
                        </Badge>
                      )}
                    </div>
                    <Card.Text className="text-muted flex-grow-1">
                      {project.description || "No description provided"}
                    </Card.Text>
                    {/* Progress Section */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Progress</small>
                        <small className="text-muted">
                          {project.statistics.completed_tasks}/
                          {project.statistics.total_tasks} tasks
                        </small>
                      </div>
                      <ProgressBar
                        now={progress}
                        variant={isCompleted ? "success" : "primary"}
                        className="mb-1"
                      />
                      <div className="text-center">
                        <small className="text-muted">
                          {progress}% complete
                        </small>
                      </div>
                    </div>
                    {/* Project Stats */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex gap-2">
                        <Badge
                          bg="primary"
                          className="d-flex align-items-center gap-1"
                        >
                          <Calendar size={12} />
                          {project.statistics.total_tasks} tasks
                        </Badge>
                        {project.statistics.completed_tasks > 0 && (
                          <Badge
                            bg="success"
                            className="d-flex align-items-center gap-1"
                          >
                            <CheckCircle size={12} />
                            {project.completed_count} done
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted">
                        Created{" "}
                        {new Date(project.created_at).toLocaleDateString()}
                      </small>
                    </div>

                    <Collapse in={expandedUpload[project.id]}>
                      <div className="border-top pt-3 mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">
                            <Upload size={16} className="me-2" />
                            Upload Project Files
                          </h6>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => toggleUploadSection(project.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        <FileUploadComponent
                          key={project.id}
                          projectId={project.id}
                          tasks={project.tasks || []} // Pass the tasks array
                          allowTaskSelection={true} // Enable task selection
                          token={token}
                          onFilesUploaded={(files) =>
                            handleFilesUploaded(project.id, files)
                          }
                          maxFiles={5}
                          maxFileSize={10 * 1024 * 1024} // 10MB
                          allowedTypes={[
                            "image/*",
                            "application/pdf",
                            ".doc",
                            ".docx",
                            ".txt",
                            ".md",
                            ".zip",
                            ".rar",
                            ".png",
                            ".jpg",
                          ]}
                        />
                        ;
                      </div>
                    </Collapse>
                    {/* Action Buttons */}
                    <div className="d-flex gap-2 mt-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewProject(project.id)}
                        className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                      >
                        View Tasks
                        <ArrowRight size={14} />
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => toggleUploadSection(project.id)}
                        title="Upload Files"
                      >
                        <Upload size={14} />
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => openEditModal(project)}
                        title="Edit Project"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() =>
                          handleDeleteProject(project.id, project.name)
                        }
                        title="Delete Project"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })
        )}
      </Row>

      {/* Create Project Modal */}
      <Modal show={showCreateModal} onHide={closeModals}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateProject}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter project name"
                required
                minLength={3}
                maxLength={200}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your project (optional)"
                maxLength={500}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? <Spinner size="sm" /> : "Create Project"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal show={showEditModal} onHide={closeModals}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditProject}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter project name"
                required
                minLength={3}
                maxLength={200}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your project (optional)"
                maxLength={500}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? <Spinner size="sm" /> : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProjectsDashboard;
