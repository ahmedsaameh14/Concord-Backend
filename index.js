const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db.config');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();
const corsMiddleware = require('./middlewares/cors.middleware')

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(corsMiddleware);
app.use(express.json());

connectDB();

app.use('/auth', require('./routes/auth.route'));
app.use('/admin/projects', require('./routes/admin-project.route'));
app.use('/admin', require('./routes/admin.route'));
app.use('/category/projects', require('./routes/project.route'));
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server Started at port ${PORT}`));

// Test Branch Master
