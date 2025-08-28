import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "./hooks/use_auth";

function TaskEditForm({ taskId, onTaskUpdated, onCancel }) {
  const { token } = useAuth();
  // State management remains identical - React Bootstrap doesn't change your data flow
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

  // Fetch task data when component mounts - same logic, enhanced error handling
  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);

        const response = await fetch(
          `http://localhost:5000/api/tasks/${taskId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Task not found - it may have been deleted");
          } else {
            throw new Error(`Failed to load task: ${response.status}`);
          }
        }

        const result = await response.json();
        const taskData = result.data;

        // Format data for form consumption - same formatting logic
        const formattedData = {
          title: taskData.title,
          description: taskData.description,
          due_date: taskData.due_date ? taskData.due_date.split("T")[0] : "",
          completed: taskData.completed,
        };

        setFormData(formattedData);
        setOriginalData(formattedData);
      } catch (error) {
        console.error("Error fetching task:", error);
        setFetchError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (taskId) {
      fetchTaskData();
    }
  }, [taskId]);

  // Handle input changes - same validation clearing logic
  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const actualValue = type === "checkbox" ? checked : value;

    setFormData((prevData) => ({
      ...prevData,
      [name]: actualValue,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prevErrors) => ({
        ...prevErrors,
        [name]: "",
      }));
    }
  };

  // Check if form has been modified - same comparison logic
  const hasChanges = () => {
    if (!originalData) return false;
    return Object.keys(formData).some(
      (key) => formData[key] !== originalData[key]
    );
  };

  // Form validation - same rules, enhanced presentation
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

      if (selectedDate < today && !formData.completed) {
        errors.due_date = "Due date cannot be in the past for incomplete tasks";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission handler - same API logic, enhanced feedback
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    // If no changes, just close the form
    if (!hasChanges()) {
      onCancel();
      return;
    }

    if (!validateForm()) {
      setSubmitError("Please fix the validation errors above");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${taskId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 404) {
          throw new Error(
            "Task not found - it may have been deleted by another user"
          );
        } else if (response.status === 409) {
          throw new Error(
            "This task has been modified by another user. Please refresh and try again."
          );
        } else {
          throw new Error(
            errorData.error || `Update failed: ${response.status}`
          );
        }
      }

      const result = await response.json();

      // Notify parent component of successful update
      if (onTaskUpdated) {
        onTaskUpdated(result.data);
      }
    } catch (error) {
      console.error("Error updating task:", error);
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel with confirmation if changes exist
  const handleCancel = () => {
    if (hasChanges()) {
      const confirmCancel = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmCancel) return;
    }
    onCancel();
  };

  // Loading state with Bootstrap spinner
  if (isLoading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading task data...</div>
        </Card.Body>
      </Card>
    );
  }

  // Error state with Bootstrap alert
  if (fetchError) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error Loading Task</Alert.Heading>
            <p>{fetchError}</p>
            <Button variant="outline-danger" onClick={onCancel}>
              Close
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-primary">
      <Card.Header className="bg-primary text-white">
        <Card.Title className="mb-0">Edit Task</Card.Title>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          {/* Title Field - Bootstrap form styling with validation */}
          <Form.Group className="mb-3">
            <Form.Label htmlFor="title">Task Title</Form.Label>
            <Form.Control
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              isInvalid={!!validationErrors.title}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.title}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Description Field */}
          <Form.Group className="mb-3">
            <Form.Label htmlFor="description">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              isInvalid={!!validationErrors.description}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.description}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Due Date Field */}
          <Form.Group className="mb-3">
            <Form.Label htmlFor="due_date">Due Date</Form.Label>
            <Form.Control
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleInputChange}
              isInvalid={!!validationErrors.due_date}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.due_date}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Completion Status Checkbox */}
          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              id="completed"
              name="completed"
              checked={formData.completed}
              onChange={handleInputChange}
              label="Mark as completed"
            />
          </Form.Group>

          {/* Action Buttons */}
          <Row>
            <Col>
              <ButtonGroup>
                <Button
                  type="submit"
                  variant="success"
                  disabled={isSubmitting || !hasChanges()}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </ButtonGroup>

              {/* Show "No changes" indicator when appropriate */}
              {!hasChanges() && !isSubmitting && (
                <small className="text-muted ms-3">No changes to save</small>
              )}
            </Col>
          </Row>

          {/* Error Message Display */}
          {submitError && (
            <Row className="mt-3">
              <Col>
                <Alert variant="danger" className="mb-0">
                  {submitError}
                </Alert>
              </Col>
            </Row>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
}

export default TaskEditForm;
