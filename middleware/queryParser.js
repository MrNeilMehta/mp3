// Parses query strings such as ?where={}, ?sort={}, etc.
module.exports = function (req, res, next) {
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
        e.message = 'Invalid query parameter format';
        next(e);
    }
};
