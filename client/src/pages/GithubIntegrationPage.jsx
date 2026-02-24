import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle,
    ExternalLink,
    GitBranch,
    RefreshCw,
    Settings,
    Upload,
    Users,
    X
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Container,
    Form,
    Modal,
    Nav,
    ProgressBar,
    Row,
    Spinner,
    Tab,
    Table,
    Tabs
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import GithubIcon from "../components/common/GithubIcon";
import { useAuth } from "../hooks/use_auth";

const API_BASE_URL = "http://localhost:5000/api";

/**
 * GitHub Integration Management Component
 * 
 * Provides the interface for users to connect their GitHub account, view repositories,
 * and import issues as tasks.
 * 
 * Flow:
 * 1. Checks current integration status.
 * 2. If NOT connected: Shows a "Connect GitHub" call-to-action.
 * 3. If connected:
 *    - Fetches and displays a list of repositories.
 *    - Allows configuration of sync settings per repository.
 *    - Provides an import modal to importing issues from a selected repository.
 *    - Handles disconnection of the integration.
 */
const GitHubIntegrationComponent = () => {
  const navigate = useNavigate();
  // State management
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [importOptions, setImportOptions] = useState({
    project_id: "",
    state: "open",
    labels: "",
    per_page: 50,
  });
  const [importPreview, setImportPreview] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

  const { token } = useAuth();

  // Fetch integration status
  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/integrations/github/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setIntegrationStatus(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching integration status:", error);
      setError(`Failed to fetch Github, integration status: ${error.message}`);
    }
  };

  // Fetch repositories
  const fetchRepositories = async () => {
    if (!integrationStatus?.connected) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/integrations/github/repositories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      console.log("Frontend received repositories:", result);
      if (result.success) {
        setRepositories(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setError(`Failed to fetch repositories: ${error.message}`);
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Initialize component
  useEffect(() => {
    console.log(
      "🚀 ~ GitHubIntegrationComponent ~ useEffect: Initialize component"
    );
    const initialize = async () => {
      setLoading(true);
      await Promise.all([fetchIntegrationStatus(), fetchProjects()]);
      setLoading(false);
    };

    initialize();
  }, [token]);

  // Fetch repositories when integration status changes
  useEffect(() => {
    if (integrationStatus?.connected) {
      fetchRepositories();
    }
  }, [integrationStatus?.connected]);

  // Connect to GitHub
  const handleConnectGitHub = async () => {
    try {
      setActionLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/github`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        // Redirect to Github, OAuth;
        window.location.href = result.authorization_url;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error connecting GitHub:", error);
      setError(`Failed to connect GitHub: ${error.message}`);
      setActionLoading(false);
    }
  };

  // Disconnect Github integration
  const handleDisconnectGitHub = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect your GitHub integration? This will not delete existing synced tasks."
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch(`${API_BASE_URL}/integrations/github`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setSuccess("Github integration disconnected successfully");
        setIntegrationStatus({ connected: false });
        setRepositories([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error disconnecting GitHub:", error);
      setError(`Failed to disconnect GitHub: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open import modal
  const handleOpenImportModal = (repo) => {
    setSelectedRepo(repo);
    setImportOptions({
      project_id: repo.project_id || "",
      state: "open",
      labels: "",
      per_page: 50,
    });
    setImportPreview(null);
    setShowImportModal(true);
  };

  // Get import preview
  const handleGetPreview = async () => {
    if (!selectedRepo || !importOptions.project_id) return;

    try {
      setActionLoading(true);

      const [owner, repo] = selectedRepo.full_name.split("/");
      const queryParams = new URLSearchParams({
        state: importOptions.state,
        labels: importOptions.labels,
        per_page: "10", // Preview only shows 10 items
      });

      const response = await fetch(
        `${API_BASE_URL}/integrations/github/repositories/${owner}/${repo}/issues/preview?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setImportPreview(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error getting preview:", error);
      setError(`Failed to get preview: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Import issues
  const handleImportIssues = async () => {
    if (!selectedRepo || !importOptions.project_id) return;

    try {
      setImportProgress({
        status: "importing",
        message: "Importing issues...",
      });

      const response = await fetch(
        `${API_BASE_URL}/integrations/github/import-issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repo_full_name: selectedRepo.full_name,
            project_id: importOptions.project_id,
            options: {
              state: importOptions.state,
              labels: importOptions.labels,
              per_page: importOptions.per_page,
            },
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setImportProgress({
          status: "complete",
          message: result.message,
          data: result.data,
        });
        setSuccess(result.message);

        // Refresh integration status and repositories
        await fetchIntegrationStatus();
        await fetchRepositories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error importing issues:", error);
      setImportProgress({
        status: "error",
        message: `Import failed: ${error.message}`,
      });
      setError(`Failed to import issues: ${error.message}`);
    }
  };

  // Close modal and reset state
  const handleCloseModal = () => {
    setShowImportModal(false);
    setSelectedRepo(null);
    setImportPreview(null);
    setImportProgress(null);
    setImportOptions({
      project_id: "",
      state: "open",
      labels: "",
      per_page: 50,
    });
  };

  // Auto-dismiss alerts
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center py-5">
          <Spinner animation="grow" variant="primary" />
          <div className="mt-3 text-muted fw-medium">Loading Github integration...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="mb-5 fade-in-up">
        <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                <span className="text-uppercase fw-bold ls-1">INTEGRATIONS</span>
                <span>/</span>
                <span>GITHUB</span>
              </div>
              <h1 className="mb-0 fw-bold d-flex align-items-center gap-3">
                <GithubIcon size={32} className="text-dark" />
                GitHub Integration
              </h1>
            </div>
            <Button 
                variant="light"
                className="d-flex align-items-center gap-2 rounded-pill px-3 bg-white border shadow-sm text-muted hover-fade"
                onClick={() => navigate('/projects')}
            >
                <ArrowLeft size={16} /> 
                Back to Projects
            </Button>
          </div>
          <p className="text-muted lead" style={{ maxWidth: '700px' }}>
            Seamlessly connect your repositories to sync issues, automate workflows, and manage your development tasks directly within Taskly.
          </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="shadow-sm border-0 mb-4">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        </Alert>
      )}

      {success && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSuccess(null)}
          className="shadow-sm border-0 mb-4"
        >
          <div className="d-flex align-items-center gap-2">
             <CheckCircle size={18} />
             {success}
          </div>
        </Alert>
      )}

      <Tab.Container defaultActiveKey="overview" className="mb-4">
        <Nav variant="pills" className="mb-4 bg-light rounded-pill p-1 d-inline-flex">
            <Nav.Item>
                <Nav.Link eventKey="overview" className="rounded-pill px-4">Overview</Nav.Link>
            </Nav.Item>
            {integrationStatus?.connected && (
                <Nav.Item>
                    <Nav.Link eventKey="repositories" className="rounded-pill px-4">
                        Repositories <Badge bg="light" text="dark" className="ms-1 rounded-pill">{repositories.length}</Badge>
                    </Nav.Link>
                </Nav.Item>
            )}
        </Nav>

        <Tab.Content>
          {/* Overview Tab */}
          <Tab.Pane eventKey="overview" className="fade-in">
            <Row>
              <Col lg={8}>
                {!integrationStatus?.connected ? (
                  <Card className="border-0 shadow-premium text-center py-5">
                    <Card.Body>
                      <div className="p-4 bg-light rounded-circle d-inline-flex mb-4">
                        <GithubIcon size={64} className="text-dark" />
                      </div>
                      <h3 className="fw-bold mb-3">Connect Your Github Account</h3>
                      <p className="text-muted mb-4 mx-auto" style={{ maxWidth: "500px" }}>
                        Unlock the power of bi-directional sync. Import issues as tasks, link commits, and track your development velocity without leaving Taskly.
                      </p>
                      <Button
                        variant="dark"
                        size="lg"
                        onClick={handleConnectGitHub}
                        disabled={actionLoading}
                        className="d-inline-flex align-items-center gap-2 px-5 py-3 shadow-sm"
                      >
                        {actionLoading ? (
                          <Spinner size="sm" className="me-2 text-white" />
                        ) : (
                          <GithubIcon size={20} className="me-2" />
                        )}
                        Authenticate with GitHub
                      </Button>
                    </Card.Body>
                  </Card>
                ) : (
                  <Card className="border-0 shadow-premium glass mb-4">
                    <Card.Body className="p-4">
                      <div className="d-flex align-items-center justify-content-between mb-4 pb-4 border-bottom">
                        <div className="d-flex align-items-center gap-4">
                          <img
                            src={integrationStatus.avatar_url}
                            alt="Github Avatar"
                            className="rounded-circle shadow-sm"
                            style={{ width: "64px", height: "64px", border: "2px solid white" }}
                          />
                          <div>
                            <h4 className="mb-1 fw-bold">
                              {integrationStatus.github_username}
                            </h4>
                            <div className="d-flex align-items-center gap-2">
                                <Badge bg="success" className="d-flex align-items-center gap-1 rounded-pill px-2">
                                  <CheckCircle size={10} /> Connected
                                </Badge>
                                <span className="text-muted small">
                                    Since {new Date(integrationStatus.connected_since).toLocaleDateString()}
                                </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          onClick={handleDisconnectGitHub}
                          disabled={actionLoading}
                          className="d-flex align-items-center gap-2 rounded-pill px-3"
                        >
                          {actionLoading ? (
                            <Spinner size="sm" />
                          ) : (
                            <X size={16} />
                          )}
                          Disconnect
                        </Button>
                      </div>

                      <Row className="text-center g-3">
                        <Col md={3}>
                          <div className="p-3 bg-light bg-opacity-50 rounded-4">
                            <h3 className="fw-bold text-dark mb-0">{integrationStatus.total_repositories}</h3>
                            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Repositories</small>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="p-3 bg-primary bg-opacity-10 rounded-4">
                            <h3 className="fw-bold text-primary mb-0">{integrationStatus.total_synced_tasks}</h3>
                            <small className="text-primary text-opacity-75 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Synced Tasks</small>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="p-3 bg-warning bg-opacity-10 rounded-4">
                            <h3 className="fw-bold text-warning mb-0">{integrationStatus.open_tasks}</h3>
                            <small className="text-warning text-opacity-75 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Open Tasks</small>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="p-3 bg-success bg-opacity-10 rounded-4">
                            <h3 className="fw-bold text-success mb-0">{integrationStatus.closed_tasks}</h3>
                            <small className="text-success text-opacity-75 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Closed Tasks</small>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}
              </Col>

              {integrationStatus?.connected && (
                <Col lg={4}>
                  <Card className="border-0 shadow-sm glass h-100">
                    <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
                      <h6 className="fw-bold text-muted mb-0">RECENT ACTIVITY</h6>
                    </Card.Header>
                    <Card.Body className="p-4">
                       <div className="d-flex align-items-start gap-3 mb-3">
                          <div className="p-2 bg-light rounded-circle">
                             <RefreshCw size={16} className="text-muted" />
                          </div>
                          <div>
                             <div className="fw-medium">Last Synchronization</div>
                             <small className="text-muted">
                                {integrationStatus.last_sync
                                  ? new Date(integrationStatus.last_sync).toLocaleString()
                                  : "Never"}
                             </small>
                          </div>
                       </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Tab.Pane>

          {/* Repositories Tab */}
          {integrationStatus?.connected && (
            <Tab.Pane eventKey="repositories" className="fade-in">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold mb-0">Connected Repositories</h5>
                <Button
                  variant="white"
                  className="border shadow-sm d-flex align-items-center gap-2"
                  onClick={fetchRepositories}
                  disabled={actionLoading}
                >
                  <RefreshCw size={16} className={actionLoading ? "spin" : ""} />
                  Refresh List
                </Button>
              </div>

              {repositories.length === 0 ? (
                <Card className="border-0 shadow-sm bg-light text-center py-5">
                  <Card.Body>
                    <GitBranch size={48} className="text-muted opacity-50 mb-3" />
                    <h6 className="text-muted">No repositories found.</h6>
                    <p className="text-muted small">Ensure your GitHub organization permissions are configured correctly.</p>
                  </Card.Body>
                </Card>
              ) : (
                <Row className="g-4">
                    {repositories.map((repo) => (
                      <Col lg={6} key={repo.id}>
                        <Card className={`border-0 shadow-sm h-100 transition-all ${repo.configured ? "border-start border-4 border-success bg-success bg-opacity-10" : "bg-white"}`}>
                          <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                 <h6 className="mb-1 fw-bold text-truncate" style={{ maxWidth: '280px' }}>
                                  <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-decoration-none text-dark d-flex align-items-center gap-2"
                                  >
                                    {repo.full_name}
                                    <ExternalLink size={12} className="text-muted" />
                                  </a>
                                </h6>
                                <p className="text-muted small mb-0 text-truncate-2" style={{ minHeight: '40px' }}>
                                  {repo.description || "No description provided"}
                                </p>
                              </div>
                               {repo.private && (
                                  <Badge bg="light" text="dark" className="border">Private</Badge>
                               )}
                            </div>

                          <div className="d-flex align-items-center gap-2 mb-4">
                              <Badge bg="secondary" className="bg-opacity-10 text-secondary fw-normal border border-secondary border-opacity-25">
                                {repo.language || "Unknown"}
                              </Badge>
                              <Badge bg="info" className="bg-opacity-10 text-info fw-normal border border-info border-opacity-25">
                                {repo.open_issues_count} issues
                              </Badge>
                              {repo.configured && (
                                <Badge bg="success" className="d-flex align-items-center gap-1">
                                  <CheckCircle size={10} /> Configured
                                </Badge>
                              )}
                          </div>
                          
                           {repo.project_name && (
                              <div className="mb-3 p-2 bg-light rounded text-muted small d-flex align-items-center gap-2">
                                <BookOpen size={14} />
                                Linked: <strong>{repo.project_name}</strong>
                              </div>
                            )}

                          <div className="d-grid">
                            <Button
                              variant={repo.configured ? "outline-primary" : "primary"}
                              size="sm"
                              className="d-flex align-items-center justify-content-center gap-2"
                              onClick={() => handleOpenImportModal(repo)}
                              disabled={repo.open_issues_count === 0}
                            >
                              <Upload size={14} />
                              {repo.configured ? "Sync Issues" : "Import Issues"}
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Tab.Pane>
          )}
        </Tab.Content>
      </Tab.Container>

      {/* Import Issues Modal */}
      <Modal show={showImportModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">
            Import from {selectedRepo?.full_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {importProgress ? (
            <div className="text-center py-5">
              {importProgress.status === "importing" && (
                <>
                  <Spinner animation="border" variant="primary" className="mb-4" />
                  <h5 className="fw-bold">Importing Issues...</h5>
                  <p className="text-muted">{importProgress.message}</p>
                </>
              )}

              {importProgress.status === "complete" && (
                <>
                  <div className="p-3 bg-success bg-opacity-10 rounded-circle d-inline-flex mb-3">
                    <CheckCircle size={32} className="text-success" />
                  </div>
                  <h5 className="fw-bold">Import Complete!</h5>
                  <p className="text-muted mb-4">{importProgress.message}</p>
                  
                  {importProgress.data && (
                    <div className="d-flex justify-content-center gap-3">
                      <div className="text-center px-3 py-2 bg-light rounded">
                        <div className="h4 fw-bold text-success mb-0">{importProgress.data.imported_count}</div>
                        <small className="text-muted">Imported</small>
                      </div>
                      <div className="text-center px-3 py-2 bg-light rounded">
                        <div className="h4 fw-bold text-secondary mb-0">{importProgress.data.skipped_count}</div>
                        <small className="text-muted">Skipped</small>
                      </div>
                       <div className="text-center px-3 py-2 bg-light rounded">
                        <div className="h4 fw-bold text-primary mb-0">{importProgress.data.total_found}</div>
                        <small className="text-muted">Found</small>
                      </div>
                    </div>
                  )}
                </>
              )}

              {importProgress.status === "error" && (
                <>
                  <div className="p-3 bg-danger bg-opacity-10 rounded-circle d-inline-flex mb-3">
                    <X size={32} className="text-danger" />
                  </div>
                  <h5 className="fw-bold">Import Failed</h5>
                  <p className="text-muted">{importProgress.message}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <Form>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-muted">TARGET PROJECT</Form.Label>
                  <Form.Select
                    value={importOptions.project_id}
                    className="search-input-premium"
                    onChange={(e) =>
                      setImportOptions({
                        ...importOptions,
                        project_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select a project destination...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-bold text-muted">ISSUE STATE</Form.Label>
                      <Form.Select
                        value={importOptions.state}
                        className="search-input-premium"
                        onChange={(e) =>
                          setImportOptions({
                            ...importOptions,
                            state: e.target.value,
                          })
                        }
                      >
                        <option value="open">Open Issues Only</option>
                        <option value="closed">Closed Issues Only</option>
                        <option value="all">All Issues</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-bold text-muted">MAX ISSUES</Form.Label>
                      <Form.Select
                        value={importOptions.per_page}
                        className="search-input-premium"
                        onChange={(e) =>
                          setImportOptions({
                            ...importOptions,
                            per_page: e.target.value,
                          })
                        }
                      >
                        <option value="10">10 issues</option>
                        <option value="25">25 issues</option>
                        <option value="50">50 issues</option>
                        <option value="100">100 issues</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex gap-2 mb-4 p-3 bg-light rounded-3">
                  <Button
                    variant="link"
                    className="p-0 text-decoration-none fw-bold"
                    onClick={handleGetPreview}
                    disabled={!importOptions.project_id || actionLoading}
                  >
                    {actionLoading ? (
                      <Spinner size="sm" className="me-1" />
                    ) : (
                      <BookOpen size={16} className="me-1" />
                    )}
                    Generate Preview
                  </Button>
                </div>
              </Form>

              {importPreview && (
                <div className="mt-4 animate-slide-up">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                     <h6 className="fw-bold mb-0">Preview Results</h6>
                     <Badge bg="primary">{importPreview.total_issues} found</Badge>
                  </div>
                  
                  {importPreview.issues.length > 0 ? (
                    <div className="border rounded-3 overflow-hidden shadow-sm" style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <Table hover className="mb-0 bg-white">
                        <thead className="bg-light sticky-top">
                          <tr>
                            <th className="py-2 text-muted fw-normal small border-0">ID</th>
                            <th className="py-2 text-muted fw-normal small border-0">TITLE</th>
                            <th className="py-2 text-muted fw-normal small border-0">STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.issues.map((issue) => (
                            <tr key={issue.github_issue_id}>
                              <td className="text-muted">#{issue.github_issue_number}</td>
                              <td className="fw-medium">
                                <div className="d-flex align-items-center">
                                  <span className="text-truncate" style={{ maxWidth: "250px" }}>{issue.title}</span>
                                  {issue.already_imported && (
                                    <Badge bg="light" text="dark" className="ms-2 border">
                                      Exists
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td>
                                <Badge
                                  bg={
                                    issue.github_state === "open"
                                      ? "success"
                                      : "secondary"
                                  }
                                  className="rounded-pill px-2"
                                >
                                  {issue.github_state}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center p-3 text-muted">No issues found matching criteria.</div>
                  )}
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={handleCloseModal} disabled={actionLoading}>
            {importProgress?.status === "complete" ? "Close" : "Cancel"}
          </Button>
          {!importProgress && (
            <Button
              variant="primary"
              onClick={handleImportIssues}
              disabled={!importOptions.project_id || actionLoading}
              className="d-flex align-items-center gap-2 px-4 shadow-sm"
            >
              Start Import <ArrowRight size={16} />
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GitHubIntegrationComponent;
