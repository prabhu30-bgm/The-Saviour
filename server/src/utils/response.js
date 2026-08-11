/**
 * Formats a successful API response
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Data to return
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

module.exports = {
  sendSuccess
};
