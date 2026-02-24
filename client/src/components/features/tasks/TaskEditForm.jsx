import { Calendar, CheckSquare, Edit, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { useNotification } from "../../../context/NotificationContext";
import { api } from "../../../utils/api";

/**
 * Task Editing Form Component
 */
function TaskEditForm({ taskId, onTaskUpdated, onCancel }) {
  const { showNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    completed: false,
  });

  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setIsLoading(true);
        const result = await api.get(`/tasks/${taskId}`);
        const taskData = result.data;

        const formattedData = {
          title: taskData.title,
          description: taskData.description,
          due_date: taskData.due_date ? taskData.due_date.split("T")[0] : "",
          completed: taskData.completed,
        };

        setFormData(formattedData);
        setOriginalData(formattedData);
      } catch (error) {
        setFetchError(error.message || "Failed to load directive specs.");
      } finally {
        setIsLoading(false);
      }
    };

    if (taskId) fetchTaskData();
  }, [taskId]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const actualValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: actualValue }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const hasChanges = () => {
    if (!originalData) return false;
    return Object.keys(formData).some((key) => formData[key] !== originalData[key]);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "A title is required.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!hasChanges()) {
      onCancel();
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await api.put(`/tasks/${taskId}`, formData);
      showNotification("Directive Specs Updated", "success");
      if (onTaskUpdated) onTaskUpdated(result.data);
    } catch (error) {
      setSubmitError(error.message || "Protocol Update Failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      if (!window.confirm("Unsaved parameters detected. Discard changes?")) return;
    }
    onCancel();
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm glass">
        <Card.Body className="text-center py-5">
          <Spinner animation="grow" variant="primary" />
          <div className="mt-3 text-muted fw-medium">Syncing directive data...</div>
        </Card.Body>
      </Card>
    );
  }

  if (fetchError) {
    return (
      <Card className="border-0 shadow-sm glass">
        <Card.Body>
          <Alert variant="danger" className="border-0">
            <Alert.Heading className="h6 fw-bold">Sync Failure</Alert.Heading>
            <p className="small mb-0">{fetchError}</p>
            <Button variant="outline-danger" size="sm" className="mt-3" onClick={onCancel}>
              Terminate
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Modal 
      show={!!taskId} 
      onHide={handleCancel} 
      centered 
      size="lg"
      className="premium-modal"
      backdrop="static"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
          <div className="p-2 bg-primary bg-opacity-10 rounded-circle text-primary">
            <Edit size={20} />
          </div>
          Update Directive
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row>
             <Col md={8}>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-muted">TITLE</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    className={`search-input-premium ${validationErrors.title ? 'border-danger' : ''}`}
                    value={formData.title}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.title}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.title}
                  </Form.Control.Feedback>
                </Form.Group>
             </Col>
             <Col md={4}>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-2">
                    <Calendar size={14} /> DUE DATE
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="due_date"
                    className={`search-input-premium ${validationErrors.due_date ? 'border-danger' : ''}`}
                    value={formData.due_date}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.due_date}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.due_date}
                  </Form.Control.Feedback>
                </Form.Group>
             </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label className="small fw-bold text-muted">DESCRIPTION</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="description"
              className={`search-input-premium ${validationErrors.description ? 'border-danger' : ''}`}
              value={formData.description}
              onChange={handleInputChange}
              isInvalid={!!validationErrors.description}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.description}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              id="completed"
              name="completed"
              checked={formData.completed}
              onChange={handleInputChange}
              label={
                <span className="d-flex align-items-center gap-2">
                    <CheckSquare size={16} className={formData.completed ? "text-success" : "text-muted"} />
                    <span className={formData.completed ? "text-success fw-medium" : "text-muted"}>
                        Mark directive as completed
                    </span>
                </span>
              }
              className="custom-checkbox"
            />
          </Form.Group>

          {submitError && (
             <Alert variant="danger" className="mb-4 border-0 shadow-sm">
               {submitError}
             </Alert>
          )}

          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <Button
              variant="light"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 fw-medium"
            >
              Abeyance
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !hasChanges()}
              className="px-4 d-flex align-items-center gap-2 shadow-sm"
              style={{ fontWeight: 600 }}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" animation="border" className="me-1" />
                  Syncing...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update Parameters
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default TaskEditForm;
