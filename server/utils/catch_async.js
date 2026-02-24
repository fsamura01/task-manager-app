/**
 * @file catch_async.js
 * @description Utility to wrap async functions and catch errors, passing them to the next middleware.
 */

module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
