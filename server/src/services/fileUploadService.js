const fs = require('fs');
const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

/**
 * Uploads a file either to Cloudinary or saves it locally if Cloudinary is not configured
 * @param {Object} file - Multer file object
 * @returns {Promise<string>} File URL or relative path
 */
const uploadFile = async (file) => {
  if (!file) return null;

  if (isCloudinaryConfigured()) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'disaster_requests',
        resource_type: 'auto'
      });
      
      // Clean up local temporary file asynchronously
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Error deleting temp file ${file.path}:`, err);
      });

      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload failed, falling back to local file path:', error);
      // Fallback to local url if upload fails
    }
  }

  // Fallback / Local configuration:
  // Multer already places the file in public/uploads.
  // We just return the relative URL to access it via Express static middleware.
  const relativePath = `/uploads/${file.filename}`;
  return relativePath;
};

module.exports = {
  uploadFile
};
