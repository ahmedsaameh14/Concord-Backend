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

const uploadDocument = (file, folder = 'concord/resumes') =>
  new Promise((resolve, reject) => {
    if (!file?.buffer) {
      reject(new Error('No file provided'));
      return;
    }

    const baseName = (file.originalname || 'resume.pdf')
      .replace(/\.pdf$/i, '')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'resume';
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', public_id: `${Date.now()}-${baseName}.pdf` },
      (error, result) => error ? reject(error) : resolve(result.secure_url)
    );
    stream.end(file.buffer);
  });

const attachmentUrl = (url, fileName = 'resume.pdf') => {
  if (!url || !url.includes('/upload/')) return url;
  const safeName = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'resume';
  return url.replace('/upload/', `/upload/fl_attachment:${safeName}/`);
};

const privateDownloadUrl = (url) => {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const marker = '/raw/upload/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return url;

    const path = parsed.pathname.slice(markerIndex + marker.length);
    const publicId = path.replace(/^v\d+\//, '');
    return cloudinary.utils.private_download_url(publicId, 'pdf', {
      resource_type: 'raw',
      type: 'upload',
      attachment: true,
    });
  } catch {
    return url;
  }
};

module.exports = {
  uploadBuffer,
  uploadMany,
  uploadDocument,
  attachmentUrl,
  privateDownloadUrl,
};
