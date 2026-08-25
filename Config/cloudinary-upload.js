const cloudinary = require('./cloudinary');

const uploadBuffer = (file, folder = 'concord/projects') =>
  new Promise((resolve, reject) => {
    if (!file?.buffer) {
      reject(new Error('No file provided'));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });

const uploadMany = async (files = [], folder = 'concord/projects') => {
  if (!files.length) return [];
  return Promise.all(files.map((file) => uploadBuffer(file, folder)));
};

module.exports = {
  uploadBuffer,
  uploadMany,
};
