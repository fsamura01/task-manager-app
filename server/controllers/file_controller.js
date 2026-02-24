const path = require("path");
const crypto = require("crypto");
const fs = require("fs-extra");
const db = require("../database");
const { activeStrategy, STORAGE_STRATEGIES } = require("../config/storage");
const s3Storage = require("../middleware/s3_upload_middleware");
const calculateFileHash = require("../utils/calculate-filehash");
const catchAsync = require("../utils/catch_async");
const { BadRequestError, NotFoundError, ForbiddenError } = require("../utils/app_error");

/**
 * @description Uploads a single file.
 */
exports.uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new BadRequestError("No file provided");
  }

  const { task_id, task_ids, project_id } = req.body;

  let taskIdsToProcess = [];
  if (task_id) {
    taskIdsToProcess = [parseInt(task_id)];
  } else if (task_ids) {
    taskIdsToProcess = typeof task_ids === "string" 
      ? task_ids.split(",").map(id => parseInt(id.trim()))
      : Array.isArray(task_ids) ? task_ids.map(id => parseInt(id)) : [];
  }

  // Security check
  if (taskIdsToProcess.length > 0) {
    const taskCheck = await db.query(
      "SELECT id FROM tasks WHERE id = ANY($1) AND user_id = $2",
      [taskIdsToProcess, req.user.userId]
    );
    if (taskCheck.rows.length !== taskIdsToProcess.length) {
      throw new ForbiddenError("Access denied to one or more tasks.");
    }
  }

  let storedFilename, filePath, s3Key = null, s3Url = null;
  
  if (activeStrategy === STORAGE_STRATEGIES.S3) {
    storedFilename = req.file.key.split("/").pop();
    s3Key = req.file.key;
    s3Url = req.file.location;
    filePath = req.file.key;
  } else {
    storedFilename = req.file.filename;
    filePath = req.file.path.replace(/\\/g, '/');
  }

  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  const uploadHash = crypto.createHash("md5").update((req.file.key || req.file.filename) + Date.now()).digest("hex");

  const commonData = [
    req.file.originalname, storedFilename, filePath, req.file.size, 
    req.file.mimetype, fileExtension, uploadHash, true, 
    req.user.userId, project_id ? parseInt(project_id) : null, 
    s3Key, s3Url, activeStrategy
  ];

  const createdFiles = [];
  if (taskIdsToProcess.length === 0) {
    const result = await db.query(
      `INSERT INTO files (filename, stored_filename, file_path, file_size, mime_type, file_extension, upload_hash, is_validated, user_id, project_id, s3_key, s3_url, storage_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      commonData
    );
    createdFiles.push(result.rows[0]);
  } else {
    for (const taskId of taskIdsToProcess) {
      const result = await db.query(
        `INSERT INTO files (filename, stored_filename, file_path, file_size, mime_type, file_extension, upload_hash, is_validated, user_id, task_id, project_id, s3_key, s3_url, storage_provider)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [...commonData.slice(0, 9), taskId, ...commonData.slice(9)]
      );
      createdFiles.push(result.rows[0]);
    }
  }

  res.status(201).json({
    success: true,
    message: `File processed via ${activeStrategy.toUpperCase()}`,
    data: createdFiles[0]
  });
});

/**
 * @description Retrieves download URL for a file.
 */
exports.downloadFile = catchAsync(async (req, res, next) => {
  const fileId = parseInt(req.params.id);
  const result = await db.query(
    `SELECT filename, file_path, s3_key, s3_url, mime_type, file_size, storage_provider
     FROM files 
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [fileId, req.user.userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("File not found");
  }

  const fileInfo = result.rows[0];

  if (fileInfo.storage_provider === STORAGE_STRATEGIES.S3) {
    const presignedUrl = await s3Storage.generatePresignedUrl(fileInfo.s3_key, 3600);
    return res.json({
      success: true,
      data: { download_url: presignedUrl, filename: fileInfo.filename }
    });
  } else {
    const protocol = req.protocol;
    const host = req.get('host');
    const directUrl = `${protocol}://${host}/${fileInfo.file_path}`;
    return res.json({
      success: true,
      data: { download_url: directUrl, filename: fileInfo.filename }
    });
  }
});

/**
 * @description Lists user files.
 */
exports.getFiles = catchAsync(async (req, res, next) => {
  const { task_id, project_id, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT f.*, t.title as task_title, p.name as project_name
    FROM files f
    LEFT JOIN tasks t ON f.task_id = t.id
    LEFT JOIN projects p ON f.project_id = p.id
    WHERE f.user_id = $1 AND f.deleted_at IS NULL
  `;

  const params = [req.user.userId];
  let paramIndex = 2;

  if (task_id) {
     query += ` AND f.task_id = $${paramIndex++}`;
     params.push(parseInt(task_id));
  }
  if (project_id) {
     query += ` AND f.project_id = $${paramIndex++}`;
     params.push(parseInt(project_id));
  }

  query += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await db.query(query, params);
  res.json({ success: true, data: result.rows });
});

/**
 * @description Soft deletes a file.
 */
exports.deleteFile = catchAsync(async (req, res, next) => {
  const fileId = parseInt(req.params.id);
  const userId = req.user.userId;

  const fileResult = await db.query(
    "SELECT s3_key, filename, storage_provider FROM files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
    [fileId, userId]
  );

  if (fileResult.rows.length === 0) {
    throw new NotFoundError("File not found");
  }

  const fileInfo = fileResult.rows[0];

  if (fileInfo.storage_provider === "s3" && fileInfo.s3_key) {
    await s3Storage.deleteFromS3(fileInfo.s3_key);
  }

  const result = await db.query(
    `UPDATE files SET deleted_at = $1, updated_at = $1 WHERE id = $2 AND user_id = $3 RETURNING id`,
    [new Date(), fileId, userId]
  );

  res.json({ success: true, message: "File deleted." });
});
