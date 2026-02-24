import {
    AlertCircle,
    Archive,
    Calendar,
    Check,
    CheckCircle2,
    Download,
    File,
    FileArchive,
    FileAudio,
    FileCode,
    FileImage,
    FileText,
    FileVideo,
    Paperclip,
    Trash2,
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
import { useAuth } from "../../../hooks/use_auth";

/**
 * File Upload and Management Component
 * 
 * Handles file uploads, listing, and deletion for projects and tasks. Supports drag-and-drop,
 * multiple file selection, and association with specific tasks.
 * 
 * Flow:
 * 1.  Fetches existing files based on projectId and taskId props.
 * 2.  Allows users to select files via drag-and-drop or file system dialog.
 * 3.  Validates file size and type constraints.
 * 4.  Optionally allows associating uploaded files with specific tasks (if enabled).
 * 5.  Uploads files to the backend/S3 and tracks progress.
 * 6.  Updates the list of files upon successful upload or deletion.
 * 7.  Handles file downloads via presigned URLs.
 */
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

      // Enhanced file mapping to include S3 metadata
      const normalizedFiles = files.data.map((file) => ({
        id: file.id,
        name: file.filename || file.name,
        originalName: file.original_name || file.name,
        size: file.file_size || file.size || 0,
        type:
          file.mime_type ||
          file.content_type ||
          file.type ||
          "application/octet-stream",
        uploadedAt: file.uploaded_at || file.created_at,
        downloadUrl:
          file.download_url || `${API_BASE_URL}/files/${file.id}/download`,
        metadata: {
          projectId: file.project_id,
          taskId: file.task_id,
          taskTitle:
            tasks.find((t) => t.id === file.task_id)?.title || "Unknown Task",
          uploadedBy: file.uploaded_by,
          storageProvider: file.storage_provider || "unknown",
          s3Key: file.s3_key,
          s3Url: file.s3_url,
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

  /**
   * validateFile: The "bouncer" for our upload club.
   * It checks if a file is invited (correct type) and not too big.
   */
  const validateFile = (file) => {
    const errors = [];
    
    // 1. Size Check: We don't want to crash the server with massive files
    if (file.size > maxFileSize) {
      const maxMB = Math.round(maxFileSize / 1024 / 1024);
      errors.push(`File "${file.name}" is too large. Limit is ${maxMB}MB.`);
    }

    // 2. Type Check: Ensure files are actually what we expect (e.g. no .exe or .scripts)
    if (allowedTypes && allowedTypes.length > 0) {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      
      // We check BOTH the MIME type (like image/png) and the extension (.png)
      const mimeTypeAllowed = allowedTypes.includes(file.type);
      const extensionAllowed = allowedTypes.some((type) => type.includes(fileExtension));

      if (!mimeTypeAllowed && !extensionAllowed) {
        errors.push(`File type ".${fileExtension}" is not permitted.`);
      }
    }

    return errors;
  };

  /**
   * handleFileSelection: Running when files are dropped or selected.
   * This prepares the files by wrapping them in a local "state" object.
   */
  const handleFileSelection = (files) => {
    const fileArray = Array.from(files); // Convert FileList to a standard Array
    const newErrors = [];
    const validFiles = [];

    // Global Limit Check: Don't allow more than X files in the "tray" at once
    if (selectedFiles.length + fileArray.length > maxFiles) {
      setErrors((prev) => [...prev, `You can only select up to ${maxFiles} files at a time.`]);
      return;
    }

    fileArray.forEach((file) => {
      // Step A: Run the "bouncer" validation
      const fileErrors = validateFile(file);
      
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else {
        // Step B: Duplicate Check
        // Don't add the same file twice if it's already in the tray.
        const isDuplicate = selectedFiles.some(
          (existing) => existing.name === file.name && existing.size === file.size
        );

        if (!isDuplicate) {
          // Step C: Packaging
          // We wrap the raw file in a "fileData" object with a unique ID for the UI list.
          validFiles.push({
            file, // The actual binary data
            id: Math.random().toString(36).substring(2, 9), // UI tracker
            name: file.name,
            size: file.size,
            type: file.type,
          });
        } else {
          newErrors.push(`"${file.name}" is already in your selection.`);
        }
      }
    });

    // Update state with our findings
    if (validFiles.length > 0) setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (newErrors.length > 0) setErrors((prev) => [...prev, ...newErrors]);
  };

  const removeSelectedFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearErrors = () => {
    setErrors([]);
    setFilesFetchError(null);
  };

  // upload file to server
  /**
   * uploadFile: The "Heavy Lifter"
   * This function handles the actual communication with the server for a single file.
   * We use XMLHttpRequest (XHR) instead of fetch because XHR lets us track upload progress
   * (e.g., showing a percentage bar to the user).
   */
  const uploadFile = (fileData) => {
    return new Promise((resolve, reject) => {
      // 1. Prepare the data: 'FormData' is required for sending actual files (binary data)
      const formData = new FormData();
      formData.append("file", fileData.file); // 'file' is the key the backend expects (Multer)

      // 2. Add context: Tell the backend which Project or Tasks this file belongs to
      if (projectId) formData.append("project_id", projectId);

      if (taskId) {
        // Option A: Specific task (from props)
        formData.append("task_id", taskId);
      } else if (allowTaskSelection && selectedTaskIds.length > 0) {
        // Option B: Multiple tasks selected from the UI list
        formData.append("task_ids", selectedTaskIds.join(","));
      }

      // 3. Setup the request: XHR gives us fine-grained control
      const xhr = new XMLHttpRequest();

      // PROGRESS TRACKING: This listener updates the UI as bits are sent to the server
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          
          // Update the local state so the specific file's progress bar moves
          setUploadingFiles((prev) =>
            prev.map((file) =>
              file.id === fileData.id ? { ...file, progress: percentComplete } : file
            )
          );
        }
      });

      // COMPLETION: Runs when the server sends a response back
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error("The server sent back an unreadable response format."));
          }
        } else {
          reject(new Error(`Upload failed. Server responded with: ${xhr.status}`));
        }
      });

      // ERROR HANDLING: Runs if the internet goes down or the server is dead
      xhr.addEventListener("error", () => {
        reject(new Error("Network connection error. Check your internet."));
      });

      // 4. Fire the request!
      xhr.open("POST", `${API_BASE_URL}/files`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`); // Security: Send our credentials
      xhr.send(formData);
    });
  };

  /**
   * handleUpload: The "Orchestrator"
   * This function runs when the user clicks 'Deploy Assets'.
   * It manages the overall state and kicks off individual file uploads.
   */
  const handleUpload = async () => {
    // Safety checks before starting
    if (selectedFiles.length === 0) return;

    if (allowTaskSelection && selectedTaskIds.length === 0) {
      setErrors((prev) => [...prev, "Please select at least one task to associate with these files."]);
      return;
    }

    // Step 1: Move files from 'Selected' state to 'Uploading' state
    const filesToUpload = selectedFiles.map((file) => ({
      ...file,
      progress: 0,
      status: "uploading",
    }));

    setUploadingFiles(filesToUpload);
    setSelectedFiles([]); // Clear the tray so the user doesn't double-click

    // Step 2: Start all uploads simultaneously
    // We create an array of promises. Each promise represents one network request.
    const uploadPromises = filesToUpload.map(async (fileData) => {
      try {
        const response = await uploadFile(fileData);
        return ({
          fileData,
          response,
          status: "success",
        });
      } catch (error) {
        return ({
          fileData,
          error,
          status: "failed",
        });
      }
    });

    try {
      // Step 3: Wait for all uploads to finish (regardless of whether they succeeded or failed)
      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.status === "success");
      const failed = results.filter(r => r.status === "failed");

      // Step 4: Update the UI with successful files
      successful.forEach(({ fileData, response }) => {
        const completedFile = {
          ...fileData,
          progress: 100,
          status: "completed",
          serverResponse: response.data,
        };
        setCompletedUploads((prev) => [...prev, completedFile]);
      });

      // Step 5: Notify the user about errors
      failed.forEach(({ fileData, error }) => {
        setErrors((prev) => [
          ...prev,
          `Failed to upload "${fileData.name}": ${error.message}`,
        ]);
      });

      // Step 6: Refresh the master file list
      if (successful.length > 0) {
        handleUploadComplete(successful.map((s) => s.response.data));
      }
    } catch (error) {
      console.error("Critical error in batch upload:", error);
      setErrors((prev) => [...prev, "The upload process encountered a critical system error."]);
    } finally {
      // Step 7: Cleanup - hide the progress bars
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

  const getFileIcon = (fileType, fileName) => {
    const type = fileType?.toLowerCase() || "";
    const name = fileName?.toLowerCase() || "";
    
    if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return <FileImage size={24} className="text-info" />;
    if (type.includes('pdf') || name.endsWith('.pdf')) return <FileText size={24} className="text-danger" />;
    if (type.includes('zip') || type.includes('compressed') || name.match(/\.(zip|rar|7z|tar|gz)$/)) return <FileArchive size={24} className="text-warning" />;
    if (type.includes('word') || name.match(/\.(doc|docx)$/)) return <FileText size={24} className="text-primary" />;
    if (type.includes('excel') || name.match(/\.(xls|xlsx|csv)$/)) return <FileText size={24} className="text-success" />;
    if (type.includes('code') || name.match(/\.(js|jsx|ts|tsx|html|css|json|sql|py|rb|php)$/)) return <FileCode size={24} className="text-dark" />;
    if (type.includes('audio')) return <FileAudio size={24} className="text-secondary" />;
    if (type.includes('video')) return <FileVideo size={24} className="text-secondary" />;
    
    return <File size={24} className="text-muted" />;
  };

  // Update your handleDownload function to work with presigned URLs
  const handleDownload = async (fileId, fileName) => {
    try {
      console.log(`Initiating download for file ID: ${fileId}`);
      // First, get the download URL from your backend
      const response = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Download request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Download metadata received:", data);

      if (!data.success || !data.data.download_url) {
        throw new Error("No download URL received from server");
      }

      // Use the URL to download the file
      // We also include the token here in case it's a local route protected by session/token
      const fileResponse = await fetch(data.data.download_url, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!fileResponse.ok) {
        throw new Error(`Asset retrieval failed: ${fileResponse.status}`);
      }

      const blob = await fileResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      console.log(`Download completed for: ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      setErrors((prev) => [
        ...prev,
        `Failed to download ${fileName}: ${error.message}`,
      ]);
    }
  };

  return (
    <div className="file-system-container fade-in">
      <Card className="border-0 shadow-premium glass overflow-hidden">
        <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-2">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary bg-opacity-10 rounded-circle text-primary shadow-sm border border-primary border-opacity-10">
                <Paperclip size={22} />
              </div>
              <div>
                <h5 className="mb-0 fw-bold font-outfit">Asset Repository</h5>
                <div className="d-flex align-items-center gap-2 mt-1">
                    {(taskId || projectId) && (
                      <Badge bg="light" text="dark" className="border fw-normal stats-badge opacity-75">
                        {taskId ? `Task #${taskId}` : `Project Workspace`}
                      </Badge>
                    )}
                    <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-10 stats-badge">
                        SYNCED
                    </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="light"
              size="sm"
              onClick={handleRefreshFiles}
              disabled={isLoadingFiles}
              className="d-flex align-items-center gap-2 rounded-pill px-3 border hover-bg-light transition-all"
            >
              {isLoadingFiles ? <Spinner size="sm" /> : <><Upload size={14} /> Sync Update</>}
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {/* Enhanced Dropzone */}
          <div
            className={`dropzone-premium rounded-4 border-2 border-dashed p-5 text-center mb-5 transition-all ${
              isDragOver
                ? "border-primary bg-primary bg-opacity-10 scale-up"
                : "border-light border-opacity-25 bg-light bg-opacity-30"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              return fileInputRef.current?.click();
            }}
            style={{ 
                cursor: "pointer", 
                minHeight: "180px", 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.05)' : 'rgba(0,0,0,0.02)'
            }}
          >
            <div className={`p-4 rounded-circle shadow-premium mb-3 transition-all ${isDragOver ? 'bg-primary text-white' : 'bg-white text-primary'}`}>
              <Upload size={36} className={isDragOver ? 'bounce-infinite' : ''} />
            </div>
            <h6 className="fw-bold mb-2 font-outfit" style={{ fontSize: '1.1rem' }}>
                {isDragOver ? "Drop assets to initiate upload" : "Click or drag assets to deploy to repository"}
            </h6>
            <p className="text-muted small mb-0 opacity-75">
              Supports bulk upload up to {maxFiles} files (Max {Math.round(maxFileSize / 1024 / 1024)}MB per file)
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

          {/* Improved Task Selection */}
          {allowTaskSelection && tasks.length > 0 && selectedFiles.length > 0 && (
            <div className="mb-5 p-4 rounded-4 bg-light bg-opacity-50 border border-light border-opacity-10 fade-in">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h6 className="small fw-bold text-muted mb-0 font-outfit tracking-wider">ASSOCIATE DIRECTIVES</h6>
                <Form.Check
                  type="checkbox"
                  id="select-all-tasks"
                  label={<span className="small text-muted">Select all active tasks</span>}
                  checked={selectAllTasks}
                  onChange={(e) => handleSelectAllTasks(e.target.checked)}
                />
              </div>
              <div className="row g-3" style={{ maxHeight: "160px", overflowY: "auto" }}>
                {tasks.map((task) => (
                  <div key={task.id} className="col-md-6">
                    <div className={`p-2 rounded-3 border transition-all ${selectedTaskIds.includes(task.id) ? 'bg-primary bg-opacity-10 border-primary border-opacity-25' : 'bg-white border-light border-opacity-50'}`}>
                        <Form.Check
                          type="checkbox"
                          id={`task-${task.id}`}
                          label={
                            <div className="ms-1">
                              <div className="fw-bold small text-dark">{task.title}</div>
                              {task.due_date && (
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  Target: {new Date(task.due_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          }
                          checked={selectedTaskIds.includes(task.id)}
                          onChange={(e) => handleTaskSelectionChange(task.id, e.target.checked)}
                        />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Preview with Enhanced List */}
          {selectedFiles.length > 0 && (
            <div className="mb-5 fade-in">
              <h6 className="small fw-bold text-muted mb-3 font-outfit tracking-wider">STAGED ASSETS ({selectedFiles.length})</h6>
              <div className="d-flex flex-column gap-2 mb-4">
                {selectedFiles.map((fileData) => (
                  <div
                    key={fileData.id}
                    className="p-3 bg-white border border-light border-opacity-50 rounded-4 shadow-sm d-flex justify-content-between align-items-center transition-all hvr-lift"
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className="p-3 bg-light rounded-3">
                        {getFileIcon(fileData.type, fileData.name)}
                      </div>
                      <div>
                        <div className="fw-bold text-dark mb-1">{fileData.name}</div>
                        <Badge bg="light" text="dark" className="border fw-normal opacity-75">
                          {formatFileSize(fileData.size)}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="link"
                      onClick={() => removeSelectedFile(fileData.id)}
                      className="text-danger p-2 hover-bg-light rounded-circle border-0"
                    >
                      <X size={20} />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="d-flex justify-content-end">
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  disabled={uploadingFiles.length > 0}
                  className="px-5 py-2 fw-bold d-flex align-items-center gap-2 shadow-premium"
                >
                  {uploadingFiles.length > 0 ? (
                    <>
                      <Spinner size="sm" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Deploy Assets
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Sleeker Progress Bars */}
          {uploadingFiles.length > 0 && (
            <div className="mb-5 p-4 rounded-4 bg-primary bg-opacity-5 border border-primary border-opacity-10 shadow-sm fade-in">
              <h6 className="small fw-bold text-primary mb-4 font-outfit tracking-wider">MODULATION PROGRESS</h6>
              <div className="d-flex flex-column gap-4">
                  {uploadingFiles.map((fileData) => (
                    <div key={fileData.id}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold text-dark">{fileData.name}</span>
                        <Badge bg="primary" className="stats-badge px-2 py-1">{fileData.progress}%</Badge>
                      </div>
                      <ProgressBar
                        now={fileData.progress}
                        variant="primary"
                        animated
                        className="rounded-pill shadow-sm"
                        style={{ height: "8px" }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Errors Display */}
          {errors.length > 0 && (
            <div className="mb-5">
              {errors.map((error, idx) => (
                <Alert key={idx} variant="danger" dismissible className="border-0 shadow-sm glass text-danger small mb-2" onClose={() => setErrors(prev => prev.filter((_, i) => i !== idx))}>
                  <AlertCircle size={16} className="me-2" /> {error}
                </Alert>
              ))}
            </div>
          )}

          <div className="mb-4">
              <h6 className="small fw-bold text-muted mb-0 font-outfit tracking-wider d-flex align-items-center gap-2">
                <FileText size={16} className="text-primary" /> MISSION REPOSITORY
              </h6>
          </div>
          
          <div className="repository-grid" style={{ minHeight: '300px' }}>
            {isLoadingFiles ? (
              <div className="text-center py-5">
                <Spinner variant="primary" size="lg" className="mb-3" />
                <p className="text-muted fw-bold font-outfit">Synchronizing assets...</p>
              </div>
            ) : existingFiles.length === 0 ? (
              <div className="text-center py-5 bg-light bg-opacity-30 rounded-4 border border-dashed border-light border-opacity-50 mt-2">
                <div className="p-4 bg-white rounded-circle d-inline-block shadow-sm mb-3">
                    <FileArchive size={48} className="text-muted opacity-20" />
                </div>
                <h6 className="text-muted fw-bold mb-1 font-outfit">Repository Empty</h6>
                <p className="text-muted small mb-0 opacity-75">No tactical assets deployed yet.</p>
              </div>
            ) : (
              <div className="row g-3 mt-1">
                {existingFiles.map((file) => (
                  <div key={file.id} className="col-12">
                      <Card className="border-0 shadow-sm rounded-4 transition-all hvr-lift border-hover-primary">
                        <Card.Body className="p-3">
                           <div className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-light rounded-4 shadow-sm">
                                    {getFileIcon(file.type, file.name)}
                                </div>
                                <div>
                                    <div className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                                        {file.name}
                                        {file.metadata.taskId && (
                                            <Badge bg="light" text="dark" className="border fw-normal stats-badge font-inter" style={{ fontSize: '0.65rem' }}>
                                                LINKED: {file.metadata.taskTitle}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted small opacity-75">
                                        <span className="d-flex align-items-center gap-1"><FileText size={12} /> {formatFileSize(file.size)}</span>
                                        <span className="d-flex align-items-center gap-1"><Calendar size={12} /> {formatUploadDate(file.uploadedAt)}</span>
                                    </div>
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                <Button 
                                    variant="light" 
                                    className="btn-icon border hover-bg-light"
                                    onClick={() => handleDownload(file.id, file.name)}
                                    title="Download Asset"
                                >
                                    <Download size={18} />
                                </Button>
                                <Button 
                                    variant="light" 
                                    className="btn-icon border text-danger hover-bg-light"
                                    onClick={() => handleDeleteFile(file.id)}
                                    title="Remove Asset"
                                >
                                    <Trash2 size={18} />
                                </Button>
                              </div>
                           </div>
                        </Card.Body>
                      </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Notifications Overlay */}
      <div className="position-fixed bottom-0 end-0 p-4" style={{ zIndex: 1050 }}>
          {completedUploads.length > 0 && (
            <Alert variant="success" className="shadow-premium border-0 mb-2 fade-in slide-up" onClose={() => setCompletedUploads([])} dismissible>
              <div className="d-flex align-items-center gap-3 pe-4">
                <div className="p-2 bg-success bg-opacity-10 rounded-circle text-success font-bold">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                   <div className="fw-bold text-dark">Upload Successful</div>
                   <div className="small text-muted opacity-75">{completedUploads.length} assets deployed to repository.</div>
                </div>
              </div>
            </Alert>
          )}

          {errors.filter(e => !e.includes('select at least one task')).length > 0 && (
            <Alert variant="danger" className="shadow-premium border-0 fade-in slide-up" onClose={() => setErrors([])} dismissible>
               <div className="d-flex align-items-center gap-3 pe-4 text-danger">
                <div className="p-2 bg-danger bg-opacity-10 rounded-circle text-danger">
                    <AlertCircle size={24} />
                </div>
                <div>
                   <div className="fw-bold">System Alert</div>
                   <div className="small opacity-75">Some assets failed to synchronize.</div>
                </div>
              </div>
            </Alert>
          )}
      </div>
    </div>
  );
};

export default FileUploadComponent;
