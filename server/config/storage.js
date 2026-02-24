const s3Storage = require("../middleware/s3_upload_middleware");
const localStorage = require("../middleware/upload");

const STORAGE_STRATEGIES = {
  S3: "s3",
  LOCAL: "local"
};

const activeStrategy = process.env.STORAGE_STRATEGY || STORAGE_STRATEGIES.S3;

const activeUpload = activeStrategy === STORAGE_STRATEGIES.LOCAL 
  ? localStorage.upload 
  : s3Storage.upload;

const activeUploadErrorHandler = activeStrategy === STORAGE_STRATEGIES.LOCAL 
  ? localStorage.handleUploadErrors 
  : s3Storage.handleUploadErrors;

module.exports = {
  STORAGE_STRATEGIES,
  activeStrategy,
  activeUpload,
  activeUploadErrorHandler
};
