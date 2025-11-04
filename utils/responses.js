// Common JSON response helpers
function ok(res, data, code = 200) {
    return res.status(code).json({ message: 'OK', data });
}

function created(res, data) {
    return res.status(201).json({ message: 'Created', data });
}

function badRequest(res, message) {
    return res.status(400).json({ message, data: null });
}

function notFound(res, message) {
    return res.status(404).json({ message, data: null });
}

function serverError(res, message) {
    return res.status(500).json({ message, data: null });
}

module.exports = { ok, created, badRequest, notFound, serverError };
