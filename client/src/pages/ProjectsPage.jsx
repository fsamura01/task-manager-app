import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Edit,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Container,
  Form,
  Modal,
  ProgressBar,
  Row,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import StatsOverview from "../components/features/dashboard/StatsOverview";
import FileUploadComponent from "../components/features/files/FileUpload"; // Your file upload component
import { useAuth } from "../hooks/use_auth";

const API_BASE_URL = "http://localhost:5000/api";

/**
 * Projects Dashboard: The "Command Center"
 * 
 * This is the first thing users see after logging in. 
 * It lists all their projects and gives them quick stats.
 */
const ProjectsDashboard = () => {
  // STATE: Think of these as the variables that remember things while the page is open.
  const [projects, setProjects] = useState([]); // Our list of projects from the server
  const [loading, setLoading] = useState(true);   // To show a spinner while waiting for the server
  const [error, setError] = useState(null);       // To store any error messages (e.g. "Server is down")
  const [showCreateModal, setShowCreateModal] = useState(false); // Controls the "New Project" popup
  const [showEditModal, setShowEditModal] = useState(false);     // Controls the "Edit Project" popup
  const [editingProject, setEditingProject] = useState(null);    // Remembers WHICH project we are editing
  const [formData, setFormData] = useState({ name: "", description: "" }); // Captures text input for projects
  const [submitting, setSubmitting] = useState(false); // Prevents user from clicking "Save" twice
  const [successMessage, setSuccessMessage] = useState(""); // Temporary "Green" success banner

  // SEARCH LOGIC
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // This "waits" for the user to stop typing
  const [isSearching, setIsSearching] = useState(false);

  const { token } = useAuth(); // Our "Keycard" for the server
  const navigate = useNavigate();

  // File upload state: Tracks which project card currently has the upload section open
  const [expandedUpload, setExpandedUpload] = useState({}); 

  /**
   * SEARCH DEBOUNCING: 
   * If we searched the server for every single letter the user typed, we'd crash the server!
   * Instead, we wait 500ms (half a second) after they stop typing before we actually search.
   */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(handler); // Cleanup: Cancel the timer if the user types another letter quickly
  }, [searchTerm]);

  /**
   * fetchProjects: The "Messenger"
   * It asks the server: "Give me all the projects for this user."
   */
  const fetchProjects = async (query = "") => {
    try {
      // Show loading indicators
      if (!query && projects.length === 0) setLoading(true);
      else setIsSearching(true);
      
      setError(null);

      // Build the URL with an optional ?search=... filter
      const url = new URL(`${API_BASE_URL}/projects/with-tasks`);
      if (query.trim()) url.searchParams.append("search", query.trim());

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Tell the server who we are
        },
      });

      if (!response.ok) throw new Error("Failed to load your projects.");

      const result = await response.json();
      setProjects(result.data || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Run the fetch whenever the search term definitively changes OR we get a new login token
  useEffect(() => {
    fetchProjects(debouncedSearch);
  }, [token, debouncedSearch]);

  /**
   * handleCreateProject: Sending the new project details to the database.
   */
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // SUCCESS: Add the new project to the list locally so the user sees it immediately
        const newProjectWithStats = {
          ...result.data,
          statistics: { total_tasks: 0, completed_tasks: 0, completion_percentage: 0 },
          status: { has_tasks: false, is_completed: false },
          tasks: []
        };
        
        setProjects((prev) => [newProjectWithStats, ...prev]);
        setShowCreateModal(false);
        setFormData({ name: "", description: "" });
        setSuccessMessage("Project created successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("Failed to reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * handleEditProject: Updating an existing project.
   */
  const handleEditProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${editingProject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Update just the one project in our list
        setProjects((prev) =>
          prev.map((p) => p.id === editingProject.id ? { ...p, ...result.data } : p)
        );
        setShowEditModal(false);
        setSuccessMessage("Project updated!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * handleDeleteProject: Deleting a project (and all its children tasks).
   */
  const handleDeleteProject = async (projectId, projectName) => {
    if (window.confirm(`Are you SURE? This deletes "${projectName}" and EVERY task inside it.`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        });

        if (response.ok) {
          // Remove it from the UI list
          setProjects((prev) => prev.filter((p) => p.id !== projectId));
          setSuccessMessage("Project vaporized.");
          setTimeout(() => setSuccessMessage(""), 3000);
        } else {
          setError("Failed to delete.");
        }
      } catch (error) {
        setError("Network error during deletion.");
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

  const handleFilesUploaded = (
    projectId,
    uploadedFiles,
    eventType = "upload"
  ) => {
    if (eventType === "upload") {
      const taskInfo = uploadedFiles.some((file) => file.task_id)
        ? " and associated with selected tasks"
        : "";

      setSuccessMessage(
        `${uploadedFiles.length} file(s) uploaded successfully to project${taskInfo}!`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
      setExpandedUpload((prev) => ({ ...prev, [projectId]: false }));
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
          <Spinner animation="grow" color="primary" />
          <div className="mt-3 text-muted fw-medium">Loading your workspace...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5 fade-in">
      {/* Header Section */}
      <Row className="mb-5">
        <Col>
          <div className="d-flex justify-content-between align-items-end">
            <div>
              <h1 className="display-5 mb-2">My Projects</h1>
              <p className="text-muted mb-0 font-inter">
                Seamlessly manage and track your ongoing projects
              </p>
            </div>
            <Button
              variant="primary"
              onClick={openCreateModal}
              className="d-flex align-items-center gap-2 px-4 shadow-sm"
            >
              <Plus size={20} />
              New Project
            </Button>
          </div>
        </Col>
      </Row>

      {/* Alerts Container */}
      <div className="mb-4">
        {successMessage && (
          <Alert
            variant="success"
            className="border-0 shadow-sm glass text-success"
            onClose={() => setSuccessMessage("")}
            dismissible
          >
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert 
            variant="danger" 
            className="border-0 shadow-sm glass text-danger"
            onClose={() => setError(null)} 
            dismissible
          >
            {error}
          </Alert>
        )}
      </div>

      <StatsOverview projects={projects} />

      {/* Search Bar - Global project search */}
      <div className="search-container mb-5 glass rounded-4 p-2 shadow-sm border border-light border-opacity-10">
        <div className="position-relative">
          <div className="position-absolute h-100 d-flex align-items-center ps-3 text-muted">
            {isSearching ? <Spinner animation="border" size="sm" variant="primary" /> : <Search size={22} />}
          </div>
          <input
            type="text"
            className="form-control form-control-lg bg-transparent border-0 ps-5 py-3 shadow-none custom-search-input"
            placeholder="Search projects by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '1.2rem' }}
          />
          {searchTerm && (
            <div className="position-absolute top-0 end-0 h-100 d-flex align-items-center pe-3">
              <Button 
                variant="link" 
                className="text-muted p-0 text-decoration-none" 
                onClick={() => setSearchTerm("")}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      <Row>
        {projects.length === 0 ? (
          <Col>
            <Card className="text-center py-5 border-0 shadow-premium">
              <Card.Body>
                <FolderOpen size={64} className="text-primary opacity-25 mb-4" />
                <h3 className="mb-3">{searchTerm ? "No projects found" : "Start your journey"}</h3>
                <p className="text-muted mb-4 max-w-md mx-auto">
                  {searchTerm 
                    ? `We couldn't find any projects matching "${searchTerm}". Try a different search term.` 
                    : "It's time to bring order to your chaos. Create your first project and let's get things moving."}
                </p>
                {!searchTerm && (
                  <Button variant="primary" size="lg" onClick={openCreateModal}>
                    Create First Project
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        ) : (
          projects.map((project) => {
            console.log("🚀 ~ ProjectsDashboard ~ project:", project)
            const progress = calculateProgress(
              project.statistics.completed_tasks,
              project.statistics.total_tasks
            );
            const isCompleted =
              project.statistics.total_tasks > 0 &&
              project.statistics.completed_tasks ===
                project.statistics.total_tasks;

            return (
              <Col md={6} key={project.id} className="mb-4">
                <Card className="project-card-premium h-100 shadow-premium">
                  <Card.Body className="p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <Card.Title className="h4 mb-0 text-truncate" style={{ maxWidth: '80%' }}>
                        {project.name}
                      </Card.Title>
                      {isCompleted ? (
                        <Badge bg="success" className="stats-badge bg-opacity-10 text-success border border-success border-opacity-25 d-flex align-items-center gap-1">
                          <CheckCircle size={14} />
                          COMPLETED
                        </Badge>
                      ) : (
                        <Badge bg="primary" className="stats-badge bg-opacity-10 text-primary border border-primary border-opacity-25">
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                    
                    <Card.Text className="text-muted mb-4 flex-grow-1" style={{ fontSize: '0.95rem' }}>
                      {project.description || "No project description available. Setting one helps stay focused on goals."}
                    </Card.Text>

                    {/* Progress Analytics */}
                    <div className="mb-4 p-3 rounded-3" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted fw-semibold">WORKSPACE PROGRESS</span>
                        <span className="small fw-bold text-primary">{progress}%</span>
                      </div>
                      <ProgressBar
                        now={progress}
                        variant={isCompleted ? "success" : "primary"}
                        style={{ height: '8px' }}
                        className="rounded-pill mb-2"
                      />
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex gap-2">
                          <span className="badge stats-badge bg-primary bg-opacity-10 text-primary">
                            {project.statistics.total_tasks} TOTAL
                          </span>
                          <span className="badge stats-badge bg-success bg-opacity-10 text-success">
                            {project.statistics.completed_tasks} DONE
                          </span>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Last sync: {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                        </small>
                      </div>
                    </div>

                    <Collapse in={expandedUpload[project.id]}>
                      <div className="border-top pt-4 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0 fw-bold">
                            <Upload size={18} className="me-2 text-primary" />
                            Upload Project Artifacts
                          </h6>
                          <Button
                            variant="link"
                            className="p-0 text-muted"
                            onClick={() => toggleUploadSection(project.id)}
                          >
                            <X size={20} />
                          </Button>
                        </div>
                        <FileUploadComponent
                          key={project.id}
                          projectId={project.id}
                          tasks={project.tasks || []}
                          allowTaskSelection={true}
                          token={token}
                          onFilesUploaded={(files) =>
                            handleFilesUploaded(project.id, files)
                          }
                          maxFiles={5}
                          maxFileSize={10 * 1024 * 1024}
                          allowedTypes={["image/*", "application/pdf", ".doc", ".docx", ".txt", ".md", ".zip", ".rar", ".png", ".jpg"]}
                        />
                      </div>
                    </Collapse>

                    {/* Modern Action Bar */}
                    <div className="d-flex gap-2 pt-3 border-top mt-auto">
                      <Button
                        variant="primary"
                        onClick={() => handleViewProject(project.id)}
                        className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                      >
                        Enter Workspace
                        <ArrowRight size={16} />
                      </Button>
                      <Button
                        variant="light"
                        onClick={() => toggleUploadSection(project.id)}
                        className="btn-icon border"
                        title="Upload Assets"
                      >
                        <Upload size={18} />
                      </Button>
                      <Button
                        variant="light"
                        onClick={() => openEditModal(project)}
                        className="btn-icon border"
                        title="Edit Metadata"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        variant="light"
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="btn-icon border text-danger"
                        title="Archive Project"
                      >
                        <Trash2 size={18} />
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
      <Modal show={showCreateModal} onHide={closeModals} centered className="premium-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h3">Initiate New Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateProject}>
          <Modal.Body className="pt-2">
            <Form.Group className="mb-4">
              <Form.Label className="text-muted small fw-bold">PROJECT IDENTITY</Form.Label>
              <Form.Control
                type="text"
                className="search-input-premium py-2"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Q1 Marketing Campaign"
                required
                minLength={3}
                maxLength={200}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-muted small fw-bold">SCOPE & OBJECTIVES</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                className="search-input-premium"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Briefly describe the mission..."
                maxLength={500}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={closeModals} className="px-4">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="px-4 shadow-sm"
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? <Spinner size="sm" /> : "Deploy Project"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal show={showEditModal} onHide={closeModals} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h3">Refine Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditProject}>
          <Modal.Body className="pt-2">
            <Form.Group className="mb-4">
              <Form.Label className="text-muted small fw-bold">AMEND IDENTITY</Form.Label>
              <Form.Control
                type="text"
                className="search-input-premium py-2"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                minLength={3}
                maxLength={200}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-muted small fw-bold">REVISE SCOPE</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                className="search-input-premium"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                maxLength={500}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={closeModals} className="px-4">
              Keep Current
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="px-4 shadow-sm"
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? <Spinner size="sm" /> : "Verify Changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProjectsDashboard;
