const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db.config');
const app = express();
const corsMiddleware = require('./middlewares/cors.middleware')

app.use(corsMiddleware);
app.use(express.json());

connectDB();

app.use('/auth' ,require('./routes/auth.route')); 
app.use('/admin', require('./routes/admin.route'));

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=> console.log(`🚀 Server Started at port ${PORT}`))

// Test Branch Master
