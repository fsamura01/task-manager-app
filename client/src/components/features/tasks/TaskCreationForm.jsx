import { Calendar, CheckCircle2, FileText, Plus, Type } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useNotification } from "../../../context/NotificationContext";
import { useAuth } from "../../../hooks/use_auth";
import { api } from "../../../utils/api";

/**
 * Task Creation Form Component
 */
const TaskCreationForm = ({ show, onHide, onTaskCreated, projectId }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const { user } = useAuth();
  const { showNotification } = useNotification();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "Every task needs a name!";
    } else if (formData.title.trim().length < 3) {
      errors.title = "That name is too short (min 3 chars).";
    }

    if (!formData.due_date) {
      errors.due_date = "Please pick a deadline.";
    } else {
      const selectedDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.due_date = "Deadlines cannot be in the past.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = () => {
    const { title, description, due_date } = formData;
    const hasRequiredFields = title.trim() && description.trim() && due_date;
    const checkDateStatus = () => {
      if (!due_date) return false;
      const selectedDate = new Date(due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    };
    return hasRequiredFields && checkDateStatus();
  };

  const handleCancel = () => {
    setFormData({ title: "", description: "", due_date: "" });
    setValidationErrors({});
    setError("");
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await api.post("/tasks", {
        ...formData,
        user_id: user.id,
        project_id: projectId,
      });

      onTaskCreated(result.data);
      showNotification("Mission Initiative Deployed", "success");
      handleCancel();
    } catch (err) {
      setError(err.message || "Action failed. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={handleCancel} 
      centered 
      size="lg"
      className="premium-modal"
      backdrop="static"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
          <div className="p-2 bg-primary bg-opacity-10 rounded-circle text-primary">
            <Plus size={20} />
          </div>
          Deploy New Directive
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {error && (
          <Alert variant="danger" className="mb-4 border-0 shadow-sm glass">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold">Protocol Failure:</span> {error}
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="small text-muted fw-bold d-flex align-items-center gap-2">
                  <Type size={14} /> TITLE
                </Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  className={`search-input-premium ${validationErrors.title ? 'border-danger' : ''}`}
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Update Backend API Documentation"
                  isInvalid={!!validationErrors.title}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.title}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="small text-muted fw-bold d-flex align-items-center gap-2">
                  <Calendar size={14} /> DUE DATE
                </Form.Label>
                <Form.Control
                  type="date"
                  name="due_date"
                  className={`search-input-premium ${validationErrors.due_date ? 'border-danger' : ''}`}
                  value={formData.due_date}
                  onChange={handleChange}
                  isInvalid={!!validationErrors.due_date}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.due_date}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label className="small text-muted fw-bold d-flex align-items-center gap-2">
              <FileText size={14} /> DESCRIPTION
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              className={`search-input-premium ${validationErrors.description ? 'border-danger' : ''}`}
              value={formData.description}
              onChange={handleChange}
              placeholder="Detail the objectives and requirements..."
              isInvalid={!!validationErrors.description}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.description}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="d-flex align-items-center justify-content-end gap-2 pt-3 border-top">
            <Button
              variant="light"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 fw-medium"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !isFormValid()}
              className="px-4 d-flex align-items-center gap-2 shadow-sm"
              style={{ fontWeight: 600 }}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Initiating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Deploy Directive
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default TaskCreationForm;
