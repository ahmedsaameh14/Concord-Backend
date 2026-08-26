const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db.config');
const corsMiddleware = require('./middleware/cors.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '2mb' }));

// Ensure DB is ready before handling requests (important on Vercel cold starts)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

app.use('/auth', require('./routes/auth.route'));
app.use('/admin', require('./routes/admin.route'));
app.use('/category/projects', require('./routes/project.route'));
app.use('/category/articles', require('./routes/article.route'));
app.use('/category/awards', require('./routes/award.route'));
app.use('/contact', require('./routes/contact.route'));
app.use('/careers', require('./routes/career.route'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Local development only — Vercel uses api/index.js instead of listen()
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server Started at port ${PORT}`);
  });
}

module.exports = app;
