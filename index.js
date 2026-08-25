const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./Config/db.config');
const corsMiddleware = require('./middleware/cors.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '2mb' }));

connectDB();

app.use('/auth', require('./routes/auth.route'));
app.use('/admin', require('./routes/admin.route'));
app.use('/category/projects', require('./routes/project.route'));
app.use('/category/articles', require('./routes/article.route'));
app.use('/category/awards', require('./routes/award.route'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server Started at port ${PORT}`));
