import {
  AlertCircle,
  Check,
  Download,
  File,
  Paperclip,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  ProgressBar,
  Row,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "./hooks/use_auth";

const FileUploadComponent = ({
  onFilesUploaded = () => {},
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024,
  allowedTypes = null,
  projectId = null,
  taskId = null,
  tasks = [], // New prop: array of tasks for selection
  allowTaskSelection = false, // New prop: enable task selection
}) => {
  // Existing state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [completedUploads, setCompletedUploads] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [existingFiles, setExistingFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [filesFetchError, setFilesFetchError] = useState(null);

  // New state for task selection
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectAllTasks, setSelectAllTasks] = useState(false);

  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const API_BASE_URL = "http://localhost:5000/api";

  // Initialize task selection
  useEffect(() => {
    if (taskId) {
      // If specific taskId is provided, pre-select it
      setSelectedTaskIds([taskId]);
    } else if (allowTaskSelection && tasks.length > 0) {
      // If task selection is allowed, default to no selection
      setSelectedTaskIds([]);
    }
  }, [allowTaskSelection, taskId, tasks.length]);

  // Handle task selection changes
  const handleTaskSelectionChange = (taskId, checked) => {
    setSelectedTaskIds((prev) => {
      if (checked) {
        return [...prev, taskId];
      } else {
        return prev.filter((id) => id !== taskId);
      }
    });

    // Update select all state
    const newSelection = checked
      ? [...selectedTaskIds, taskId]
      : selectedTaskIds.filter((id) => id !== taskId);

    setSelectAllTasks(newSelection.length === tasks.length);
  };

  const handleSelectAllTasks = (checked) => {
    setSelectAllTasks(checked);
    if (checked) {
      setSelectedTaskIds(tasks.map((task) => task.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const fetchExistingFiles = async () => {
    try {
      setFilesFetchError(null);
      setIsLoadingFiles(true);

      let endpoint = `${API_BASE_URL}/files`;
      const params = new URLSearchParams();

      if (projectId) {
        params.append("project_id", projectId);
      }
      if (taskId) {
        params.append("task_id", taskId);
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication expired. Please log in again.");
        } else if (response.status === 403) {
          throw new Error("You do not have permission to view these files.");
        } else if (response.status === 404) {
          throw new Error("Files endpoint not found.");
        } else {
          throw new Error(`Failed to fetch files: ${response.status}`);
        }
      }

      const data = await response.json();
      const files = data.files || data || [];

      const normalizedFiles = files.data.map((file) => ({
        id: file.id,
        name: file.filename || file.name,
        originalName: file.original_name || file.name,
        size: file.size || 0,
        type: file.content_type || file.type || "application/octet-stream",
        uploadedAt: file.uploaded_at || file.created_at,
        downloadUrl:
          file.download_url || `${API_BASE_URL}/files/${file.id}/download`,
        metadata: {
          projectId: file.project_id,
          taskId: file.task_id,
          taskTitle:
            tasks.find((t) => t.id === file.task_id)?.title || "Unknown Task",
          uploadedBy: file.uploaded_by,
        },
      }));

      setExistingFiles(normalizedFiles);

      if (normalizedFiles.length > 0) {
        onFilesUploaded(normalizedFiles, "initial_load");
      }
    } catch (error) {
      console.error("Error fetching existing files:", error);
      setFilesFetchError(error.message);
      setExistingFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExistingFiles();
    } else {
      setExistingFiles([]);
      setIsLoadingFiles(false);
      setFilesFetchError("Authentication required to view files.");
    }
  }, [token, projectId, taskId]);

  const handleDeleteFile = async (fileId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }

      setExistingFiles((prev) => prev.filter((file) => file.id !== fileId));
      setCompletedUploads((prev) =>
        prev.filter((file) => file.serverResponse?.id !== fileId)
      );
    } catch (error) {
      console.error("Error deleting file:", error);
      setErrors((prev) => [...prev, `Failed to delete file: ${error.message}`]);
    }
  };

  const handleRefreshFiles = () => {
    fetchExistingFiles();
  };

  const handleUploadComplete = (uploadedFiles, eventType = "upload") => {
    if (eventType === "upload") {
      const newFiles = uploadedFiles.map((serverResponse) => ({
        id: serverResponse.id,
        name: serverResponse.filename || serverResponse.name,
        originalName: serverResponse.original_name || serverResponse.name,
        size: serverResponse.size || 0,
        type: serverResponse.content_type || "application/octet-stream",
        uploadedAt: serverResponse.uploaded_at || new Date().toISOString(),
        downloadUrl:
          serverResponse.download_url ||
          `${API_BASE_URL}/files/${serverResponse.id}/download`,
        metadata: {
          projectId: serverResponse.project_id,
          taskId: serverResponse.task_id,
          taskTitle:
            tasks.find((t) => t.id === serverResponse.task_id)?.title ||
            "Unknown Task",
          uploadedBy: serverResponse.uploaded_by,
        },
      }));

      setExistingFiles((prev) => [...prev, ...newFiles]);
    }

    onFilesUploaded(uploadedFiles, eventType);
  };

  const validateFile = (file) => {
    const errors = [];
    if (file.size > maxFileSize) {
      errors.push(
        `File "${file.name}" is too large. Maximum size is ${Math.round(
          maxFileSize / 1024 / 1024
        )}MB`
      );
    }
    if (allowedTypes && allowedTypes.length > 0) {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const mimeTypeAllowed = allowedTypes.includes(file.type);
      const extensionAllowed = allowedTypes.some((type) =>
        type.includes(fileExtension)
      );
      if (!mimeTypeAllowed && !extensionAllowed) {
        errors.push(`File type "${fileExtension}" is not allowed`);
      }
    }
    return errors;
  };

  const handleFileSelection = (files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    const validFiles = [];

    if (selectedFiles.length + fileArray.length > maxFiles) {
      newErrors.push(`Cannot select more than ${maxFiles} files total`);
      setErrors((prev) => [...prev, ...newErrors]);
      return;
    }

    fileArray.forEach((file) => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else {
        const isDuplicate = selectedFiles.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size
        );
        if (!isDuplicate) {
          validFiles.push({
            file,
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
          });
        } else {
          newErrors.push(`File "${file.name}" is already selected`);
        }
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    if (newErrors.length > 0) {
      setErrors((prev) => [...prev, ...newErrors]);
    }
  };

  const removeSelectedFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearErrors = () => {
    setErrors([]);
    setFilesFetchError(null);
  };

  const uploadFile = (fileData) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", fileData.file);

      if (projectId) formData.append("project_id", projectId);

      // Handle task IDs
      if (taskId) {
        formData.append("task_id", taskId);
      } else if (allowTaskSelection && selectedTaskIds.length > 0) {
        formData.append("task_ids", selectedTaskIds.join(","));
      }

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100
          );
          setUploadingFiles((prev) =>
            prev.map((file) =>
              file.id === fileData.id
                ? { ...file, progress: percentComplete }
                : file
            )
          );
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            console.log("🚀 ~ uploadFile ~ e:", e);
            reject(new Error("Invalid response format"));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.open("POST", `${API_BASE_URL}/files`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    // Validation for task selection
    if (allowTaskSelection && selectedTaskIds.length === 0) {
      setErrors((prev) => [
        ...prev,
        "Please select at least one task to associate with the uploaded files.",
      ]);
      return;
    }

    const filesToUpload = selectedFiles.map((file) => ({
      ...file,
      progress: 0,
      status: "uploading",
    }));

    setUploadingFiles(filesToUpload);
    setSelectedFiles([]);

    const allUploadPromises = [];

    // If we have task selection enabled and multiple tasks selected,
    // upload each file to each selected task
    const tasksToAssociate =
      allowTaskSelection && selectedTaskIds.length > 0
        ? selectedTaskIds
        : [null]; // null means no specific task, just project association

    filesToUpload.forEach((fileData) => {
      tasksToAssociate.forEach((taskIdToAssociate) => {
        allUploadPromises.push(
          uploadFile(fileData, taskIdToAssociate)
            .then((response) => ({
              fileData,
              taskIdToAssociate,
              response,
              status: "completed",
            }))
            .catch((error) => ({
              fileData,
              taskIdToAssociate,
              error,
              status: "error",
            }))
        );
      });
    });

    try {
      const results = await Promise.allSettled(allUploadPromises);
      const successful = [];
      const failed = [];

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.status === "completed") {
            successful.push(result.value);
          } else {
            failed.push(result.value);
          }
        } else {
          failed.push({ error: result.reason });
        }
      });

      // Update completed uploads
      successful.forEach(({ fileData, response }) => {
        const completedFile = {
          ...fileData,
          progress: 100,
          status: "completed",
          serverResponse: response.data,
        };
        setCompletedUploads((prev) => [...prev, completedFile]);
      });

      // Handle errors
      failed.forEach(({ fileData, error, taskIdToAssociate }) => {
        const taskInfo = taskIdToAssociate
          ? ` to task ${taskIdToAssociate}`
          : "";
        setErrors((prev) => [
          ...prev,
          `Failed to upload "${fileData?.name || "unknown file"}"${taskInfo}: ${
            error?.message || "Unknown error"
          }`,
        ]);
      });

      if (successful.length > 0) {
        handleUploadComplete(successful.map((s) => s.response.data));
      }
    } catch (error) {
      console.error("Batch upload error:", error);
      setErrors((prev) => [...prev, "Some uploads failed. Please try again."]);
    } finally {
      setUploadingFiles([]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUploadDate = (dateString) => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (error) {
      console.log("🚀 ~ formatUploadDate ~ error:", error);
      return "Invalid date";
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      setErrors((prev) => [
        ...prev,
        `Failed to download ${fileName}: ${error.message}`,
      ]);
    }
  };

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <Paperclip size={20} />
                  <h5 className="mb-0">File Management</h5>
                  {(taskId || projectId) && (
                    <Badge bg="info" className="ms-2">
                      {taskId ? `Task #${taskId}` : `Project #${projectId}`}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleRefreshFiles}
                  disabled={isLoadingFiles}
                >
                  {isLoadingFiles ? <Spinner size="sm" /> : "Refresh"}
                </Button>
              </div>
            </Card.Header>

            <Card.Body>
              {/* Existing Files Section */}
              <div className="mb-4">
                <h6>Existing Files</h6>
                {isLoadingFiles && (
                  <div className="text-center py-3">
                    <Spinner className="me-2" />
                    Loading your files...
                  </div>
                )}

                {filesFetchError && (
                  <Alert variant="warning">
                    <AlertCircle size={16} className="me-2" />
                    {filesFetchError}
                  </Alert>
                )}

                {!isLoadingFiles &&
                  !filesFetchError &&
                  existingFiles.length === 0 && (
                    <div className="text-muted text-center py-3">
                      No files uploaded yet. Upload your first file below!
                    </div>
                  )}

                {!isLoadingFiles && existingFiles.length > 0 && (
                  <ListGroup className="mb-3">
                    {existingFiles.map((file) => {
                      console.log("🚀 ~ file:", file);
                      return (
                        <ListGroup.Item
                          key={file.id}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div className="d-flex align-items-center gap-2">
                            <File size={16} />
                            <div>
                              <div className="fw-medium">{file.name}</div>
                              <small className="text-muted">
                                {formatFileSize(file.size)} • Uploaded{" "}
                                {formatUploadDate(file.uploadedAt)}
                                {file.metadata.taskId && (
                                  <> • Task: {file.metadata.taskTitle}</>
                                )}
                              </small>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleDownload(file.id, file.name)}
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                )}
              </div>

              <hr />

              {/* Upload New Files Section */}
              <h6>Upload New Files</h6>

              {/* Task Selection Section */}
              {allowTaskSelection && tasks.length > 0 && (
                <div className="mb-3">
                  <h6>Select Tasks</h6>
                  <div className="mb-2">
                    <Form.Check
                      type="checkbox"
                      id="select-all-tasks"
                      label={`Select All Tasks (${tasks.length})`}
                      checked={selectAllTasks}
                      onChange={(e) => handleSelectAllTasks(e.target.checked)}
                    />
                  </div>
                  <div
                    className="border rounded p-2"
                    style={{ maxHeight: "200px", overflowY: "auto" }}
                  >
                    {tasks.map((task) => (
                      <Form.Check
                        key={task.id}
                        type="checkbox"
                        id={`task-${task.id}`}
                        label={
                          <div>
                            <div className="fw-medium">{task.title}</div>
                            {task.description && (
                              <small className="text-muted">
                                {task.description}
                              </small>
                            )}
                            {task.due_date && (
                              <small className="text-muted d-block">
                                Due:{" "}
                                {new Date(task.due_date).toLocaleDateString()}
                              </small>
                            )}
                          </div>
                        }
                        checked={selectedTaskIds.includes(task.id)}
                        onChange={(e) =>
                          handleTaskSelectionChange(task.id, e.target.checked)
                        }
                        className="mb-1"
                      />
                    ))}
                  </div>
                  {selectedTaskIds.length > 0 && (
                    <small className="text-muted">
                      {selectedTaskIds.length} task(s) selected for file
                      association
                    </small>
                  )}
                </div>
              )}

              {errors.length > 0 && (
                <Alert variant="danger" dismissible onClose={clearErrors}>
                  <Alert.Heading className="d-flex align-items-center gap-2">
                    <AlertCircle size={20} />
                    Upload Errors
                  </Alert.Heading>
                  {errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </Alert>
              )}

              <div
                className={`border-2 border-dashed rounded p-4 text-center mb-3 ${
                  isDragOver
                    ? "border-primary bg-primary bg-opacity-10"
                    : "border-secondary"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ cursor: "pointer" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className="text-muted mb-2" />
                <p className="mb-2">
                  <strong>Click to select files</strong> or drag and drop them
                  here
                </p>
                <p className="small text-muted mb-0">
                  Maximum {maxFiles} files, {formatFileSize(maxFileSize)} per
                  file
                  {allowedTypes && (
                    <>
                      <br />
                      Allowed types: {allowedTypes.join(", ")}
                    </>
                  )}
                </p>
              </div>

              <Form.Control
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileSelection(e.target.files)}
                style={{ display: "none" }}
                accept={allowedTypes?.join(",")}
              />

              {selectedFiles.length > 0 && (
                <div className="mb-3">
                  <h6>Selected Files ({selectedFiles.length})</h6>
                  <ListGroup>
                    {selectedFiles.map((fileData) => (
                      <ListGroup.Item
                        key={fileData.id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div className="d-flex align-items-center gap-2">
                          <File size={16} />
                          <div>
                            <div className="fw-medium">{fileData.name}</div>
                            <small className="text-muted">
                              {formatFileSize(fileData.size)}
                            </small>
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeSelectedFile(fileData.id)}
                        >
                          <X size={14} />
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="text-center mb-3">
                  <Button
                    variant="primary"
                    onClick={handleUpload}
                    disabled={uploadingFiles.length > 0}
                    className="d-flex align-items-center gap-2 mx-auto"
                  >
                    {uploadingFiles.length > 0 ? (
                      <>
                        <Spinner size="sm" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Upload {selectedFiles.length} File
                        {selectedFiles.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {uploadingFiles.length > 0 && (
                <div className="mb-3">
                  <h6>Uploading Files</h6>
                  {uploadingFiles.map((fileData) => (
                    <div key={fileData.id} className="mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small">{fileData.name}</span>
                        <span className="small">{fileData.progress}%</span>
                      </div>
                      <ProgressBar
                        now={fileData.progress}
                        variant="primary"
                        animated
                        striped
                      />
                    </div>
                  ))}
                </div>
              )}

              {completedUploads.length > 0 && (
                <div>
                  <h6 className="text-success">
                    Successfully Uploaded ({completedUploads.length})
                  </h6>
                  <ListGroup>
                    {completedUploads.map((fileData) => (
                      <ListGroup.Item
                        key={fileData.id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div className="d-flex align-items-center gap-2">
                          <Check size={16} className="text-success" />
                          <div>
                            <div className="fw-medium">{fileData.name}</div>
                            <small className="text-muted">
                              {formatFileSize(fileData.size)}
                            </small>
                          </div>
                        </div>
                        <Badge bg="success">Uploaded</Badge>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default FileUploadComponent;
