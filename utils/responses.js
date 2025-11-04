function ok(res, data, code = 200) {
  return res.status(code).json({ message: 'OK', data });
}

function created(res, data) {
  return res.status(201).json({ message: 'Created', data });
}

function noContent(res) {
  return res.status(204).json({ message: 'No content', data: null });
}

function badRequest(res, message) {
  return res.status(400).json({ message, data: null });
}

function notFound(res, message = 'Not found') {
  return res.status(404).json({ message, data: null });
}

function serverError(res, message = 'Server error') {
  return res.status(500).json({ message, data: null });
}

module.exports = { ok, created, noContent, badRequest, notFound, serverError };
