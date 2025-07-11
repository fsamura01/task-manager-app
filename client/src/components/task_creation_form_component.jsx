import { useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { useAuth } from "./authentication_provider_component";

// Enhanced Task Creation Form Component with Smart Button States
const TaskCreationForm = ({ onTaskCreated }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const { user, token } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Check if form is complete and valid
  const isFormValid = () => {
    const { title, description, due_date } = formData;

    // Check if all required fields have content
    const hasRequiredFields = title.trim() && description.trim() && due_date;

    // Check if due date is not in the past
    const isValidDate = () => {
      if (!due_date) return false;

      const selectedDate = new Date(due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to midnight

      return selectedDate >= today;
    };

    return hasRequiredFields && isValidDate;
  };

  // Validate individual fields
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters long";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.due_date) {
      errors.due_date = "Due date is required";
    } else {
      const selectedDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        errors.due_date = "Due date cannot be in the past";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate form before submission
    if (!validateForm()) {
      setError("Please fix the validation errors above");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onTaskCreated(data.data);
        // Reset form after successful creation
        setFormData({ title: "", description: "", due_date: "" });
        setValidationErrors({});
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.log("🚀 ~ handleSubmit ~ error:", error);
      setError("Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Create New Task</Card.Title>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter task title"
                  isInvalid={!!validationErrors.title}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.title}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Due Date</Form.Label>
                <Form.Control
                  type="date"
                  name="due_date"
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

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter task description"
              isInvalid={!!validationErrors.description}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.description}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="d-flex align-items-center">
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>

            {/* Show helpful message when form is incomplete */}
            {!isFormValid() && !loading && (
              <small className="text-muted ms-3">
                Complete all fields to create task
              </small>
            )}
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default TaskCreationForm;
