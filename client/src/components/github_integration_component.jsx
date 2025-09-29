// GitHubIntegrationComponent.jsx
import {
  CheckCircle,
  ExternalLink,
  GitBranch,
  Github,
  RefreshCw,
  Settings,
  Upload,
  Users,
  X,
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
  ProgressBar,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs,
} from "react-bootstrap";
import { useAuth } from "./hooks/use_auth";

const API_BASE_URL = "http://localhost:5000/api";

const GitHubIntegrationComponent = () => {
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
        window.location.href = result.data.authorization_url;
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
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" />
          <div className="mt-2">Loading Github integration...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="mb-1">
                <Github className="me-2" />
                <Github className="me-2" />
                Integration
              </h1>
              <p className="text-muted">
                Connect your Github repositories to import issues as tasks
              </p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          )}

          <Tabs defaultActiveKey="overview" className="mb-4">
            {/* Overview Tab */}
            <Tab eventKey="overview" title="Overview">
              <Row>
                <Col lg={8}>
                  {!integrationStatus?.connected ? (
                    <Card>
                      <Card.Body className="text-center py-5">
                        <Github size={64} className="text-muted mb-3" />
                        <Card.Title>Connect Your Github Account</Card.Title>
                        <Card.Text className="text-muted mb-4">
                          Connect your Github account to import repository
                          issues as tasks. This allows you to manage your
                          development work alongside other tasks.
                        </Card.Text>
                        <Button
                          variant="primary"
                          onClick={handleConnectGitHub}
                          disabled={actionLoading}
                          className="d-flex align-items-center mx-auto"
                        >
                          {actionLoading ? (
                            <Spinner size="sm" className="me-2" />
                          ) : (
                            <Github size={20} className="me-2" />
                          )}
                          Connect GitHub
                        </Button>
                      </Card.Body>
                    </Card>
                  ) : (
                    <Card>
                      <Card.Body>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div className="d-flex align-items-center">
                            <img
                              src={integrationStatus.avatar_url}
                              alt="Github Avatar"
                              className="rounded-circle me-3"
                              style={{ width: "48px", height: "48px" }}
                            />
                            <div>
                              <h5 className="mb-1">
                                {integrationStatus.github_username}
                                <Badge bg="success" className="ms-2">
                                  <CheckCircle size={14} className="me-1" />
                                  Connected
                                </Badge>
                              </h5>
                              <small className="text-muted">
                                Connected since{" "}
                                {new Date(
                                  integrationStatus.connected_since
                                ).toLocaleDateString()}
                              </small>
                            </div>
                          </div>
                          <Button
                            variant="outline-danger"
                            onClick={handleDisconnectGitHub}
                            disabled={actionLoading}
                          >
                            {actionLoading ? (
                              <Spinner size="sm" />
                            ) : (
                              <X size={16} />
                            )}
                            Disconnect
                          </Button>
                        </div>

                        <Row className="text-center">
                          <Col md={3}>
                            <div className="border rounded p-3">
                              <h4 className="text-primary mb-1">
                                {integrationStatus.total_repositories}
                              </h4>
                              <small className="text-muted">Repositories</small>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="border rounded p-3">
                              <h4 className="text-info mb-1">
                                {integrationStatus.total_synced_tasks}
                              </h4>
                              <small className="text-muted">Synced Tasks</small>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="border rounded p-3">
                              <h4 className="text-warning mb-1">
                                {integrationStatus.open_tasks}
                              </h4>
                              <small className="text-muted">Open Tasks</small>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="border rounded p-3">
                              <h4 className="text-success mb-1">
                                {integrationStatus.closed_tasks}
                              </h4>
                              <small className="text-muted">Closed Tasks</small>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  )}
                </Col>

                {integrationStatus?.connected && (
                  <Col lg={4}>
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Recent Activity</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="text-muted">
                          <small>
                            Last sync:{" "}
                            {integrationStatus.last_sync
                              ? new Date(
                                  integrationStatus.last_sync
                                ).toLocaleString()
                              : "Never"}
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>
            </Tab>

            {/* Repositories Tab */}
            {integrationStatus?.connected && (
              <Tab
                eventKey="repositories"
                title={`Repositories (${repositories.length})`}
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>Your Repositories</h5>
                  <Button
                    variant="outline-primary"
                    onClick={fetchRepositories}
                    disabled={actionLoading}
                  >
                    <RefreshCw size={16} className="me-1" />
                    Refresh
                  </Button>
                </div>

                {repositories.length === 0 ? (
                  <Card>
                    <Card.Body className="text-center py-4">
                      <GitBranch size={48} className="text-muted mb-3" />
                      <Card.Text className="text-muted">
                        No repositories found with issues enabled.
                      </Card.Text>
                    </Card.Body>
                  </Card>
                ) : (
                  <Row>
                    {repositories.map((repo) => (
                      <Col lg={6} key={repo.id} className="mb-3">
                        <Card
                          className={repo.configured ? "border-success" : ""}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1">
                                  <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-decoration-none"
                                  >
                                    {repo.full_name}
                                    <ExternalLink size={14} className="ms-1" />
                                  </a>
                                </h6>
                                <p className="text-muted small mb-2">
                                  {repo.description || "No description"}
                                </p>
                              </div>
                              {repo.configured && (
                                <Badge bg="success">
                                  <CheckCircle size={12} className="me-1" />
                                  Configured
                                </Badge>
                              )}
                            </div>

                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="d-flex gap-2">
                                <Badge bg="secondary">
                                  {repo.language || "Unknown"}
                                </Badge>
                                <Badge bg="info">
                                  {repo.open_issues_count} issues
                                </Badge>
                                {repo.private && (
                                  <Badge bg="warning">Private</Badge>
                                )}
                              </div>
                            </div>

                            {repo.project_name && (
                              <div className="mb-2">
                                <small className="text-muted">
                                  Linked to project:{" "}
                                  <strong>{repo.project_name}</strong>
                                </small>
                              </div>
                            )}

                            <div className="d-flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenImportModal(repo)}
                                disabled={repo.open_issues_count === 0}
                              >
                                <Upload size={14} className="me-1" />
                                Import Issues
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                disabled
                              >
                                <Settings size={14} />
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Tab>
            )}
          </Tabs>
        </Col>
      </Row>

      {/* Import Issues Modal */}
      <Modal show={showImportModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Import Issues from {selectedRepo?.full_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importProgress ? (
            <div className="text-center py-4">
              {importProgress.status === "importing" && (
                <>
                  <Spinner animation="border" className="mb-3" />
                  <p>{importProgress.message}</p>
                </>
              )}

              {importProgress.status === "complete" && (
                <>
                  <CheckCircle size={48} className="text-success mb-3" />
                  <h5>Import Complete!</h5>
                  <p>{importProgress.message}</p>
                  {importProgress.data && (
                    <div className="mt-3">
                      <Badge bg="success" className="me-2">
                        {importProgress.data.imported_count} imported
                      </Badge>
                      <Badge bg="secondary" className="me-2">
                        {importProgress.data.skipped_count} skipped
                      </Badge>
                      <Badge bg="info">
                        {importProgress.data.total_found} total found
                      </Badge>
                    </div>
                  )}
                </>
              )}

              {importProgress.status === "error" && (
                <>
                  <X size={48} className="text-danger mb-3" />
                  <h5>Import Failed</h5>
                  <p>{importProgress.message}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Target Project *</Form.Label>
                  <Form.Select
                    value={importOptions.project_id}
                    onChange={(e) =>
                      setImportOptions({
                        ...importOptions,
                        project_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Issues will be imported as tasks in this project
                  </Form.Text>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Issue State</Form.Label>
                      <Form.Select
                        value={importOptions.state}
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
                    <Form.Group className="mb-3">
                      <Form.Label>Max Issues</Form.Label>
                      <Form.Select
                        value={importOptions.per_page}
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

                <Form.Group className="mb-3">
                  <Form.Label>Filter by Labels (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={importOptions.labels}
                    onChange={(e) =>
                      setImportOptions({
                        ...importOptions,
                        labels: e.target.value,
                      })
                    }
                    placeholder="bug,enhancement"
                  />
                  <Form.Text className="text-muted">
                    Comma-separated list of labels to filter by
                  </Form.Text>
                </Form.Group>

                <div className="d-flex gap-2 mb-3">
                  <Button
                    variant="outline-info"
                    onClick={handleGetPreview}
                    disabled={!importOptions.project_id || actionLoading}
                  >
                    {actionLoading ? (
                      <Spinner size="sm" className="me-1" />
                    ) : null}
                    Preview Issues
                  </Button>
                </div>
              </Form>

              {importPreview && (
                <div className="mt-3">
                  <h6>Preview ({importPreview.total_issues} issues found)</h6>
                  <div className="mb-3">
                    <Badge bg="success" className="me-2">
                      {importPreview.new_issues} new
                    </Badge>
                    <Badge bg="secondary">
                      {importPreview.existing_issues} already imported
                    </Badge>
                  </div>

                  {importPreview.issues.length > 0 && (
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <Table striped size="sm">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.issues.map((issue) => (
                            <tr key={issue.github_issue_id}>
                              <td>#{issue.github_issue_number}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  {issue.title}
                                  {issue.already_imported && (
                                    <Badge bg="secondary" className="ms-2">
                                      Imported
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
                                >
                                  {issue.github_state}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            {importProgress?.status === "complete" ? "Close" : "Cancel"}
          </Button>
          {!importProgress && (
            <Button
              variant="primary"
              onClick={handleImportIssues}
              disabled={!importOptions.project_id}
            >
              Import Issues
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GitHubIntegrationComponent;
