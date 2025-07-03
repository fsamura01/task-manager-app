import { useState } from "react";

function TaskCreationForm({ onTaskCreated }) {
  // State for form fields - each field needs its own state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    user_id: 1, // For now, we'll hardcode a user ID
  });

  // State for form submission process
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");

  // Handle changes to any form field
  const handleInputChange = (event) => {
    const { name, value } = event.target;

    // Update the specific field that changed
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Clear any existing error for this field when user starts typing
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: "",
      }));
    }
  };

  // Validate form data before submission
  const validateForm = () => {
    const newErrors = {};

    // Check if title is provided and meaningful
    if (!formData.title.trim()) {
      newErrors.title = "Task title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Task title must be at least 3 characters long";
    }

    // Check if description is provided
    if (!formData.description.trim()) {
      newErrors.description = "Task description is required";
    }

    // Check if due date is valid and in the future
    if (!formData.due_date) {
      newErrors.due_date = "Due date is required";
    } else {
      const selectedDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare just dates

      if (selectedDate < today) {
        newErrors.due_date = "Due date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    // Don't submit if already submitting
    if (isSubmitting) return;

    // Validate form before proceeding
    if (!validateForm()) {
      setSubmitMessage("Please fix the errors above");
      return;
    }

    // Set submitting state to prevent duplicate submissions
    setIsSubmitting(true);
    setSubmitMessage("Creating task...");

    try {
      // Make the API call to create the task
      const response = await fetch("http://localhost:5000/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      // Check if the response indicates success
      if (!response.ok) {
        // If response is not ok, try to get error details
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Parse the successful response
      const result = await response.json();

      // Clear the form and show success message
      setFormData({
        title: "",
        description: "",
        due_date: "",
        user_id: 1,
      });
      setSubmitMessage("Task created successfully!");

      // Notify parent component that a task was created
      if (onTaskCreated) {
        onTaskCreated(result.data);
      }
    } catch (error) {
      // Handle any errors that occurred during submission
      console.error("Error creating task:", error);
      setSubmitMessage(`Error creating task: ${error.message}`);
    } finally {
      // Always reset submitting state
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "20px 0" }}>
      <h2>Create New Task</h2>

      <form onSubmit={handleSubmit}>
        {/* Task Title Field */}
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="title"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Task Title:
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            style={{
              width: "100%",
              padding: "8px",
              border: errors.title ? "2px solid red" : "1px solid #ccc",
              borderRadius: "4px",
            }}
            placeholder="Enter a descriptive title for your task"
          />
          {errors.title && (
            <span style={{ color: "red", fontSize: "14px" }}>
              {errors.title}
            </span>
          )}
        </div>

        {/* Task Description Field */}
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="description"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="4"
            style={{
              width: "100%",
              padding: "8px",
              border: errors.description ? "2px solid red" : "1px solid #ccc",
              borderRadius: "4px",
              resize: "vertical",
            }}
            placeholder="Describe what needs to be done"
          />
          {errors.description && (
            <span style={{ color: "red", fontSize: "14px" }}>
              {errors.description}
            </span>
          )}
        </div>

        {/* Due Date Field */}
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="due_date"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Due Date:
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleInputChange}
            style={{
              width: "100%",
              padding: "8px",
              border: errors.due_date ? "2px solid red" : "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          {errors.due_date && (
            <span style={{ color: "red", fontSize: "14px" }}>
              {errors.due_date}
            </span>
          )}
        </div>

        {/* Submit Button */}
        <div style={{ marginBottom: "15px" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? "#cccccc" : "#007bff",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: "16px",
            }}
          >
            {isSubmitting ? "Creating Task..." : "Create Task"}
          </button>
        </div>

        {/* Status Message */}
        {submitMessage && (
          <div
            style={{
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: submitMessage.includes("Error")
                ? "#ffebee"
                : "#e8f5e8",
              color: submitMessage.includes("Error") ? "#c62828" : "#2e7d32",
              border: `1px solid ${
                submitMessage.includes("Error") ? "#ef5350" : "#4caf50"
              }`,
            }}
          >
            {submitMessage}
          </div>
        )}
      </form>
    </div>
  );
}

export default TaskCreationForm;
