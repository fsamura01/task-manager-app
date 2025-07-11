import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Row,
  Spinner,
} from "react-bootstrap";

import TaskCreationForm from "./task_creation_form_component.jsx";
import TaskEditForm from "./task_edit_form_component.jsx";
// Import the useAuth hook from your authentication provider file
import { useAuth } from "./authentication_provider_component.jsx";

const API_BASE_URL = `http://localhost:5000/api`;
// Main Dashboard Component
const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const { token } = useAuth();

  // Helper function to get auth headers
  // const getAuthHeaders = () => {
  //   const token = localStorage.getItem("token");
  //   return {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${token}`,
  //   };
  // };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

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
  }, [token]);

  const handleTaskCreated = (newTask) => {
    setTasks((prevTasks) => [newTask, ...prevTasks]);
  };

  const startEditing = (taskId) => {
    setEditingTaskId(taskId);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setEditingTaskId(null);
    console.log("Task updated successfully:", updatedTask.title);
  };

  const handleEditCancel = () => {
    setEditingTaskId(null);
  };

  const toggleTaskCompletion = async (taskId) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...currentTask,
          completed: !currentTask.completed,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setDeleteLoading(taskId);

      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setTasks((currentTasks) =>
          currentTasks.filter((task) => task.id !== taskId)
        );
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteClick = (task) => {
    const confirmMessage = `Are you sure you want to delete the task "${task.title}"?\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      deleteTask(task.id);
    }
  };

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading tasks...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Tasks</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <TaskCreationForm onTaskCreated={handleTaskCreated} />

      {/* Task Edit Form - conditionally rendered */}
      {editingTaskId && (
        <Row className="mb-4">
          <Col>
            <TaskEditForm
              taskId={editingTaskId}
              onTaskUpdated={handleTaskUpdated}
              onCancel={handleEditCancel}
            />
          </Col>
        </Row>
      )}

      {/* Task Statistics */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-light">
            <Card.Body>
              <Row className="text-center">
                <Col md={4}>
                  <Badge bg="primary" className="fs-6">
                    Total Tasks: {tasks.length}
                  </Badge>
                </Col>
                <Col md={4}>
                  <Badge bg="warning" className="fs-6">
                    Incomplete: {incompleteTasks.length}
                  </Badge>
                </Col>
                <Col md={4}>
                  <Badge bg="success" className="fs-6">
                    Completed: {completedTasks.length}
                  </Badge>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tasks Display */}
      <Row>
        <Col>
          {tasks.length === 0 ? (
            <Card className="text-center">
              <Card.Body>
                <Card.Text className="text-muted">
                  No tasks found. Create your first task above!
                </Card.Text>
              </Card.Body>
            </Card>
          ) : (
            <div>
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className={`mb-3 ${
                    task.completed ? "bg-success-subtle" : ""
                  }`}
                >
                  <Card.Body>
                    <Row className="align-items-start">
                      <Col md={8}>
                        <Card.Title
                          className={`mb-2 ${
                            task.completed
                              ? "text-decoration-line-through text-muted"
                              : ""
                          }`}
                        >
                          {task.title}
                        </Card.Title>
                        <Card.Text
                          className={`mb-2 ${
                            task.completed
                              ? "text-decoration-line-through text-muted"
                              : "text-secondary"
                          }`}
                        >
                          {task.description}
                        </Card.Text>
                        <div className="small text-muted">
                          <span>
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                          {task.completed && (
                            <Badge bg="success" className="ms-3">
                              ✓ Completed
                            </Badge>
                          )}
                        </div>
                      </Col>

                      <Col md={4} className="text-end">
                        <ButtonGroup size="sm">
                          <Button
                            variant={task.completed ? "warning" : "success"}
                            onClick={() => toggleTaskCompletion(task.id)}
                          >
                            {task.completed
                              ? "Mark Incomplete"
                              : "Mark Complete"}
                          </Button>

                          <Button
                            variant="primary"
                            onClick={() => startEditing(task.id)}
                            disabled={editingTaskId !== null}
                          >
                            Edit
                          </Button>

                          <Button
                            variant="danger"
                            onClick={() => handleDeleteClick(task)}
                            disabled={deleteLoading === task.id}
                          >
                            {deleteLoading === task.id ? (
                              <Spinner as="span" animation="border" size="sm" />
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </ButtonGroup>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
