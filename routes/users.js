const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const parseQuery = require('../middleware/queryParser');
const { ok, created, badRequest, notFound, serverError } = require('../utils/responses');

const router = express.Router();

// GET /api/users
router.get('/', parseQuery, async (req, res) => {
    try {
        const { where, sort, select, skip, limit, count } = req.parsedQuery;
        let query = User.find(where, select);
        if (sort) query = query.sort(sort);
        if (skip) query = query.skip(skip);
        if (limit) query = query.limit(limit);
        if (count) {
            const result = await User.countDocuments(where);
            return ok(res, result);
        }
        const users = await query.exec();
        return ok(res, users);
    } catch (err) {
        return serverError(res, 'Failed to retrieve users');
    }
});

// POST /api/users
router.post('/', async (req, res) => {
    try {
        const { name, email, pendingTasks } = req.body;
        if (!name || !email) return badRequest(res, 'name and email are required');

        const newUser = await User.create({
            name,
            email,
            pendingTasks: Array.isArray(pendingTasks) ? pendingTasks : []
        });

        if (newUser.pendingTasks.length) {
            await Task.updateMany(
                { _id: { $in: newUser.pendingTasks } },
                { $set: { assignedUser: String(newUser._id), assignedUserName: newUser.name } }
            );
        }

        return created(res, newUser);
    } catch (err) {
        if (err.code === 11000) return badRequest(res, 'A user with this email already exists');
        return serverError(res, 'Could not create user');
    }
});

// GET /api/users/:id
router.get('/:id', parseQuery, async (req, res) => {
    try {
        const { select } = req.parsedQuery;
        const user = await User.findById(req.params.id, select);
        if (!user) return notFound(res, 'User not found');
        return ok(res, user);
    } catch {
        return serverError(res, 'Error fetching user');
    }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, email, pendingTasks } = req.body;
        if (!name || !email) return badRequest(res, 'name and email are required');

        const user = await User.findById(req.params.id);
        if (!user) return notFound(res, 'User not found');

        if (email !== user.email) {
            const existing = await User.findOne({ email });
            if (existing) return badRequest(res, 'A user with this email already exists');
        }

        const before = new Set(user.pendingTasks);
        const after = new Set(Array.isArray(pendingTasks) ? pendingTasks : []);
        const unassign = [...before].filter(x => !after.has(x));
        const assign = [...after].filter(x => !before.has(x));

        if (unassign.length) {
            await Task.updateMany(
                { _id: { $in: unassign }, assignedUser: String(user._id) },
                { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
            );
        }
        if (assign.length) {
            await Task.updateMany(
                { _id: { $in: assign } },
                { $set: { assignedUser: String(user._id), assignedUserName: name } }
            );
        }

        user.name = name;
        user.email = email;
        user.pendingTasks = Array.isArray(pendingTasks) ? pendingTasks : [];
        await user.save();
        return ok(res, user);
    } catch {
        return serverError(res, 'Failed to update user');
    }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return notFound(res, 'User not found');

        if (user.pendingTasks.length) {
            await Task.updateMany(
                { _id: { $in: user.pendingTasks } },
                { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
            );
        }

        await User.deleteOne({ _id: user._id });
        return ok(res, { _id: String(user._id) });
    } catch {
        return serverError(res, 'Could not delete user');
    }
});

module.exports = router;
