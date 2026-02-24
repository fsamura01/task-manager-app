const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file_controller");
const verifyToken = require("../middleware/verifytoken");
const { activeUpload, activeUploadErrorHandler } = require("../config/storage");

// All file routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/files
 * @desc    List all files for user
 */
router.get("/", fileController.getFiles);

/**
 * @route   POST /api/files
 * @desc    Upload a single file
 */
router.post(
  "/",
  activeUpload.single("file"),
  activeUploadErrorHandler,
  fileController.uploadFile
);

/**
 * @route   GET /api/files/:id/download
 * @desc    Get download URL for a file
 */
router.get("/:id/download", fileController.downloadFile);

/**
 * @route   DELETE /api/files/:id
 * @desc    Soft delete a file
 */
router.delete("/:id", fileController.deleteFile);

module.exports = router;
