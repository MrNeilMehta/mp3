// Parses JSON-encoded query strings as required by the MP.
// Example: ?where={"completed":true}&sort={"name":1}&select={"_id":0}&skip=10&limit=20&count=true
module.exports = function parseQuery(req, res, next) {
  try {
    const { where, sort, select, skip, limit, count } = req.query;
    req.parsedQuery = {
      where: where ? JSON.parse(where) : {},
      sort: sort ? JSON.parse(sort) : undefined,
      select: select ? JSON.parse(select) : undefined,
      skip: skip ? Number(skip) : undefined,
      limit: limit ? Number(limit) : undefined,
      count: count === 'true'
    };
    next();
  } catch (e) {
    e.statusCode = 400;
    e.expose = true;
    e.message = 'Invalid query parameter format (must be valid JSON for where/sort/select)';
    next(e);
  }
};
