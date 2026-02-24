// middleware/upload.js
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs-extra");

// Define where files will be stored and how they'll be named
/**
 * Multer Storage Configuration
 * This tells Multer: 1. Where to put the file, and 2. What to call it.
 * Behind the scenes, Multer will join these two results to create 'req.file.path'.
 */
const storage = multer.diskStorage({
  // 'destination' determines the folder path
  destination: async function (req, file, cb) {
    // We organize files by date: uploads/2026/02/
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const uploadPath = path.join("uploads", year.toString(), month);

    try {
      // Junior Note: 'fs-extra' ensureDir checks if the folder exists, 
      // and creates it automatically if it's missing.
      await fs.ensureDir(uploadPath);
      cb(null, uploadPath); // Success! Tell Multer the folder is ready.
    } catch (error) {
      cb(error); // Something went wrong with the hard drive.
    }
  },

  // 'filename' determines the name of the file on the disk
  filename: function (req, file, cb) {
    // Why not use the original name? 
    // Because if two users upload "resume.pdf", one would overwrite the other.
    // We add a timestamp and random characters to make every filename 100% unique.
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(8).toString("hex");
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const secureFilename = `${uniqueSuffix}${fileExtension}`;

    cb(null, secureFilename); // Success! Tell Multer the unique name.
  },
});

// Define file filtering logic - this acts as a security gatekeeper
const fileFilter = function (req, file, cb) {
  console.log(`[DEBUG: Multer] 🛡️ Validating file: ${file.originalname} (MIME: ${file.mimetype})`);

  // Define allowed file types - customize this based on your needs
  const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",

    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx

    // Text files
    "text/plain",
    "text/csv",
    "application/rtf",

    // Archives
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
  ];

  // Get file extension for additional validation
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".rtf",
    ".zip",
    ".rar",
  ];

  // Validate both MIME type and file extension
  const mimeTypeValid = allowedMimeTypes.includes(file.mimetype);
  const extensionValid = allowedExtensions.includes(fileExtension);

  if (mimeTypeValid && extensionValid) {
    console.log(`[DEBUG: Multer] ✅ Validation PASSED for: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(
      `[DEBUG: Multer] ⛔ Validation FAILED for: ${file.originalname}. MIME: ${file.mimetype}, Extension: ${fileExtension}`
    );
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`
      )
    );
  }
};

// Create the multer upload instance with our configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit - adjust as needed
    files: 10, // Maximum 10 files per request
  },
});

// Custom error handler middleware for upload errors
const handleUploadErrors = (error, req, res, next) => {
  console.error("Upload error:", error);

  if (error instanceof multer.MulterError) {
    // Handle specific multer errors
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          error: "File too large",
          message: "File size cannot exceed 50MB",
        });

      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          error: "Too many files",
          message: "Cannot upload more than 10 files at once",
        });

      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          error: "Unexpected file field",
          message: "Unexpected file upload field",
        });

      default:
        return res.status(400).json({
          success: false,
          error: "Upload error",
          message: error.message,
        });
    }
  } else if (error.message && error.message.includes("Invalid file type")) {
    // Handle our custom file type validation errors
    return res.status(400).json({
      success: false,
      error: "Invalid file type",
      message: error.message,
    });
  }

  // For any other errors, pass them to the next error handler
  next(error);
};

// Export the configured upload middleware and error handler
module.exports = {
  upload,
  handleUploadErrors,
  // Export individual methods for different use cases
  single: (fieldName) => upload.single(fieldName),
  multiple: (fieldName, maxCount) => upload.array(fieldName, maxCount || 10),
  fields: (fieldsArray) => upload.fields(fieldsArray),
};
