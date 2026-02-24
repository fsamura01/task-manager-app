/**
 * @file error_handler.js
 * @description Global error handling middleware for formatting error responses.
 */

const handleDatabaseError = (err) => {
  // Handle specific database errors (e.g., unique constraint violation in Postgres/MySQL)
  // For now, these are generic placeholders since we need to know the DB engine and error codes
  if (err.code === "ER_DUP_ENTRY") {
    return {
      message: "Duplicate field value entered.",
      statusCode: 400,
    };
  }
  return {
    message: "A database error occurred.",
    statusCode: 500,
  };
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    console.error("ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === "JsonWebTokenError") error.statusCode = 401; // Unauthorized
    if (err.name === "TokenExpiredError") error.statusCode = 401; // Unauthorized
    
    // Database error mapping could go here
    if (err.code && err.code.startsWith("ER_")) {
        const dbErr = handleDatabaseError(err);
        error.message = dbErr.message;
        error.statusCode = dbErr.statusCode;
        error.isOperational = true;
    }

    sendErrorProd(error, res);
  }
};
