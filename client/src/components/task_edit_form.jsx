import { useEffect, useState } from "react";

function TaskEditForm({ taskId, onTaskUpdated, onCancel }) {
  // State for the form data - initialized as empty, populated when data loads
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    completed: false,
  });

  // State for tracking the original data when first loaded
  const [originalData, setOriginalData] = useState(null);

  // Loading and error states for the initial data fetch
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch the current task data when component mounts
  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);

        const response = await fetch(
          `http://localhost:5000/api/tasks/${taskId}`
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

        // Format the data for form consumption
        const formattedData = {
          title: taskData.title,
          description: taskData.description,
          due_date: taskData.due_date ? taskData.due_date.split("T")[0] : "", // Convert to YYYY-MM-DD format
          completed: taskData.completed,
        };

        // Set both current form data and original data for comparison
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
  console.log("🚀 ~ TaskEditForm ~ taskId:", taskId);

  // Handle input changes with validation clearing
  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const actualValue = type === "checkbox" ? checked : value;

    setFormData((prevData) => ({
      ...prevData,
      [name]: actualValue,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prevErrors) => ({
        ...prevErrors,
        [name]: "",
      }));
    }
  };

  // Check if the form has been modified from its original state
  const hasChanges = () => {
    if (!originalData) return false;

    return Object.keys(formData).some(
      (key) => formData[key] !== originalData[key]
    );
  };

  // Validate the form data
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

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    // Check if there are actually changes to save
    if (!hasChanges()) {
      onCancel(); // Nothing to save, just close the form
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
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error types
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

  // Handle canceling the edit operation
  const handleCancel = () => {
    if (hasChanges()) {
      const confirmCancel = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmCancel) return;
    }

    onCancel();
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading task data...</p>
      </div>
    );
  }

  // Show error state if fetch failed
  if (fetchError) {
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid #ff4444",
          backgroundColor: "#fff5f5",
        }}
      >
        <h3>Error Loading Task</h3>
        <p>{fetchError}</p>
        <button onClick={onCancel}>Close</button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "20px 0",
        padding: "20px",
        border: "1px solid #ddd",
      }}
    >
      <h2>Edit Task</h2>

      <form onSubmit={handleSubmit}>
        {/* Title Field */}
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
              border: validationErrors.title
                ? "2px solid red"
                : "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          {validationErrors.title && (
            <span style={{ color: "red", fontSize: "14px" }}>
              {validationErrors.title}
            </span>
          )}
        </div>

        {/* Description Field */}
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
              border: validationErrors.description
                ? "2px solid red"
                : "1px solid #ccc",
              borderRadius: "4px",
              resize: "vertical",
            }}
          />
          {validationErrors.description && (
            <span style={{ color: "red", fontSize: "14px" }}>
              {validationErrors.description}
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
              border: validationErrors.due_date
                ? "2px solid red"
                : "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          {validationErrors.due_date && (
            <span style={{ color: "red", fontSize: "14px" }}>
              {validationErrors.due_date}
            </span>
          )}
        </div>

        {/* Completed Checkbox */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              name="completed"
              checked={formData.completed}
              onChange={handleInputChange}
              style={{ marginRight: "8px" }}
            />
            Mark as completed
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button
            type="submit"
            disabled={isSubmitting || !hasChanges()}
            style={{
              backgroundColor:
                isSubmitting || !hasChanges() ? "#cccccc" : "#28a745",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: isSubmitting || !hasChanges() ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>

        {/* Status Messages */}
        {submitError && (
          <div
            style={{
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: "#ffebee",
              color: "#c62828",
              border: "1px solid #ef5350",
            }}
          >
            {submitError}
          </div>
        )}
      </form>
    </div>
  );
}
export default TaskEditForm;
