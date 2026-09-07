const multer = require('multer');
const AppError = require('../utils/app-error');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new AppError('Only image files are allowed', 400), false);
    return;
  }
  cb(null, true);
};

const resumeFileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    cb(new AppError('Resume must be a PDF file', 400), false);
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

exports.uploadProjectImages = upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'ProjectImages', maxCount: 12 },
]);

exports.uploadSingleImage = upload.fields([{ name: 'image', maxCount: 1 }]);

exports.uploadResume = multer({
  storage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 1 * 1024 * 1024 },
}).single('resume');
