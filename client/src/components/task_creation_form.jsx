import { useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";

function TaskCreationForm({ onTaskCreated }) {
  // State management remains identical to your original implementation
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    user_id: 1, // Hardcoded for now
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");

  // Input change handler - same logic, just cleaner with React Bootstrap
  const handleInputChange = (event) => {
    const { name, value } = event.target;

    // Update the form data for the specific field that changed
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Clear existing validation errors when user starts typing
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: "",
      }));
    }
  };

  // Validation logic remains the same - React Bootstrap just makes error display prettier
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Task title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Task title must be at least 3 characters long";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Task description is required";
    }

    if (!formData.due_date) {
      newErrors.due_date = "Due date is required";
    } else {
      const selectedDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.due_date = "Due date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler - same API logic, enhanced UI feedback
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      setSubmitMessage("Please fix the errors above");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("Creating task...");

    try {
      const response = await fetch("http://localhost:5000/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      // Clear form and show success message
      setFormData({
        title: "",
        description: "",
        due_date: "",
        user_id: 1,
      });
      setSubmitMessage("Task created successfully!");

      // Notify parent component
      if (onTaskCreated) {
        onTaskCreated(result.data);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      setSubmitMessage(`Error creating task: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <Card.Title className="mb-0">Create New Task</Card.Title>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          {/* Task Title Field - Form.Group provides consistent spacing */}
          <Form.Group className="mb-3">
            <Form.Label htmlFor="title">Task Title</Form.Label>
            <Form.Control
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter a descriptive title for your task"
              isInvalid={!!errors.title} // Bootstrap's built-in validation styling
            />
            <Form.Control.Feedback type="invalid">
              {errors.title}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Task Description Field */}
          <Form.Group className="mb-3">
            <Form.Label htmlFor="description">Description</Form.Label>
            <Form.Control
              as="textarea" // React Bootstrap way to render textarea
              rows={4}
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what needs to be done"
              isInvalid={!!errors.description}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description}
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
              isInvalid={!!errors.due_date}
            />
            <Form.Control.Feedback type="invalid">
              {errors.due_date}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Submit Button with Loading State */}
          <Row>
            <Col>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="me-2"
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
                    Creating Task...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </Col>
          </Row>

          {/* Status Message Display */}
          {submitMessage && (
            <Row className="mt-3">
              <Col>
                <Alert
                  variant={
                    submitMessage.includes("Error") ? "danger" : "success"
                  }
                  className="mb-0"
                >
                  {submitMessage}
                </Alert>
              </Col>
            </Row>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
}

export default TaskCreationForm;
