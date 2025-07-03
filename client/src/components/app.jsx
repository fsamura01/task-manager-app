import { useEffect, useState } from "react";
import "../App.css";
import TaskCreationForm from "./task_creation_form.jsx";
import TaskEditForm from "./task_edit_form.jsx";

function App() {
  // Instead of serverMessage, let's use a more descriptive name
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Function to handle when a new task is created
  const handleTaskCreated = (newTask) => {
    // Add the new task to the beginning of the tasks array
    setTasks((prevTasks) => [newTask, ...prevTasks]);

    // Optionally scroll to show the new task
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Function to start editing a specific task
  const startEditing = (taskId) => {
    setEditingTaskId(taskId);
  };

  // Function to handle when a task is updated
  const handleTaskUpdated = (updatedTask) => {
    // Update the specific task in the tasks array
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );

    // Close the edit form
    setEditingTaskId(null);

    // Show success feedback (optional)
    console.log("Task updated successfully:", updatedTask.title);
  };

  // Function to handle canceling the edit operation
  const handleEditCancel = () => {
    setEditingTaskId(null);
  };

  // Function to toggle task completion status (quick action)
  const toggleTaskCompletion = async (taskId) => {
    // Find the current task
    const currentTask = tasks.find((task) => task.id === taskId);

    if (!currentTask) return;

    // Optimistically update the UI
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    // In a real app, you'd make an API call here
    console.log(
      `Task ${taskId} completion toggled to ${!currentTask.completed}`
    );
  };

  // Main delete function - this is where the magic happens
  const deleteTask = async (taskId) => {
    try {
      // Show loading state for the specific task being deleted
      setDeleteLoading(taskId);

      // Make the DELETE request to your backend
      const response = await fetch(
        `http://localhost:5000/api/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // Remove the deleted task from our local state immediately
        // This gives users instant feedback without waiting for a refetch
        setTasks((currentTasks) =>
          currentTasks.filter((task) => task.id !== taskId)
        );

        console.log("Task deleted successfully:", data);
      } else {
        if (response.status === 404) {
          console.log(
            `🚀 ~ deleteTask ~ "Task not found - it may have already been deleted":`,
            "Task not found - it may have already been deleted"
          );
        } else if (response.status === 409) {
          console.log(
            `🚀 ~ deleteTask ~ "Cannot delete this task - it's referenced by other records":`,
            "Cannot delete this task - it's referenced by other records"
          );
        }

        console.error("Delete failed:", data);
      }
    } catch (err) {
      // Handle network errors or other unexpected issues
      console.error("Error deleting task:", err);
    } finally {
      // Always clear the loading state
      setDeleteLoading(null);
    }
  };

  // Confirmation dialog before deletion - this prevents accidental deletions
  const handleDeleteClick = (task) => {
    const confirmMessage = `Are you sure you want to delete the task "${task.title}"?\nThis action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      deleteTask(task.id);
    }
  };

  // Function to fetch all tasks from the API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://localhost:5000/api/tasks");

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const result = await response.json();
      setTasks(result.data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTasks();
    // // Set loading to true when we start the request
    // setLoading(true);

    // fetch("http://localhost:5000/api/tasks")
    //   .then((response) => {
    //     // Check if the response is successful
    //     if (!response.ok) {
    //       throw new Error(`HTTP error! status: ${response.status}`);
    //     }

    //     return response.json();
    //   })
    //   .then((data) => {
    //     // Set the tasks array from the response
    //     setTasks(data.data || []); // Use empty array as fallback
    //     setLoading(false);
    //   })
    //   .catch((error) => {
    //     console.error("Error fetching tasks:", error);
    //     setError(error.message);
    //     setLoading(false);
    //   });
  }, []);

  // Separate completed and incomplete tasks for better organization
  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  // Handle different states of your data
  if (loading) {
    return <div>Loading tasks...</div>;
  }

  if (error) {
    return <div>Error loading tasks: {error}</div>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center", color: "#999", marginBottom: "30px" }}>
        Task Manager App
      </h1>

      {/* Task creation form */}
      <TaskCreationForm onTaskCreated={handleTaskCreated} />

      {/* Task edit form - only show when editing */}
      {editingTaskId && (
        <div style={{ marginBottom: "20px" }}>
          <TaskEditForm
            taskId={editingTaskId}
            onTaskUpdated={handleTaskUpdated}
            onCancel={handleEditCancel}
          />
        </div>
      )}

      {/* Task statistics */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#e9cc",
          borderRadius: "8px",
        }}
      >
        <div>
          <strong>Total Tasks: {tasks.length}</strong>
        </div>
        <div>
          <strong>Incomplete: {incompleteTasks.length}</strong>
        </div>
        <div>
          <strong>Completed: {completedTasks.length}</strong>
        </div>
      </div>

      {/* Check if we have tasks before trying to display them */}
      <div>
        {tasks.length === 0 ? (
          <p>No tasks found. Create your first task!</p>
        ) : (
          <div>
            {/* Map over the tasks array to create individual task elements */}
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "15px",
                  marginBottom: "15px",
                  backgroundColor: task.completed ? "#f0f8f0" : "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 8px 0",
                        textDecoration: task.completed
                          ? "line-through"
                          : "none",
                        color: task.completed ? "#666" : "#333",
                      }}
                    >
                      {task.title}
                    </h3>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        color: "#666",
                        textDecoration: task.completed
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {task.description}
                    </p>
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      <span>
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                      {task.completed && (
                        <span style={{ marginLeft: "15px" }}>✓ Completed</span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: "8px", marginLeft: "15px" }}
                  >
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      style={{
                        backgroundColor: task.completed ? "#ffc107" : "#28a745",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {task.completed ? "Mark Incomplete" : "Mark Complete"}
                    </button>

                    <button
                      onClick={() => startEditing(task.id)}
                      disabled={editingTaskId !== null}
                      style={{
                        backgroundColor:
                          editingTaskId !== null ? "#ccc" : "#007bff",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor:
                          editingTaskId !== null ? "not-allowed" : "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteClick(task)}
                      disabled={deleteLoading === task.id}
                      style={{
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        minWidth: "100px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
