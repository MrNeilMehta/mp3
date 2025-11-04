module.exports = function (app) {
  app.use('/api/users', require('./users'));
  app.use('/api/tasks', require('./tasks'));

  // Optional base route
  app.get('/api', (req, res) => {
    res.json({ message: "OK", data: "API working" });
  });
};
