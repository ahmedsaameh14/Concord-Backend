const mongoose = require('mongoose');

let cached = global.__concordMongoose;

if (!cached) {
  cached = global.__concordMongoose = {
    conn: null,
    promise: null,
  };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.CONNECTION_STRING) {
    throw new Error('CONNECTION_STRING is missing');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.CONNECTION_STRING, {
        bufferCommands: false,
      })
      .then((connection) => {
        console.log(`✅ Database Connected : ${connection.connection.host}`);
        return connection;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error(`Database connection error: ${err.message}`);
    throw err;
  }
};

module.exports = connectDB;
