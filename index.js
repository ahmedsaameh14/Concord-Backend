const app = require('./app');

const PORT = process.env.PORT || 3000;

// Local development only — Vercel uses api/index.js instead of listen()
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server Started at port ${PORT}`);
  });
}

module.exports = app;
