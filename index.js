const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db.config');
const path = require('path')
const app = express();
const AppError = require('./utils/app-error.util');

app.use(express.json());

connectDB();

app.use('/auth' ,require('./routes/auth.route')); 

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=> console.log(`🚀 Server Started at port ${PORT}`))
