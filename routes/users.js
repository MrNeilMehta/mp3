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
    let q = User.find(where, select);
    if (sort) q = q.sort(sort);
    if (typeof skip === 'number') q = q.skip(skip);
    // MP says "unlimited for users" => don't set default; only set if provided
    if (typeof limit === 'number') q = q.limit(limit);

    if (count) {
      const c = await User.countDocuments(where);
      return ok(res, c);
    }
    const users = await q.exec();
    return ok(res, users);
  } catch (e) {
    return serverError(res, 'Failed to fetch users');
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, pendingTasks } = req.body || {};
    if (!name || !email) return badRequest(res, 'name and email are required');

    const user = await User.create({
      name,
      email,
      pendingTasks: Array.isArray(pendingTasks) ? pendingTasks : []
    });

    // Ensure any pendingTasks are assigned to this user
    if (user.pendingTasks.length) {
      await Task.updateMany(
        { _id: { $in: user.pendingTasks } },
        { $set: { assignedUser: String(user._id), assignedUserName: user.name } }
      );
    }

    return created(res, user);
  } catch (e) {
    if (e.code === 11000) return badRequest(res, 'A user with this email already exists');
    return serverError(res, 'Failed to create user');
  }
});

// GET /api/users/:id (supports ?select=)
router.get('/:id', parseQuery, async (req, res) => {
  try {
    const { select } = req.parsedQuery;
    const user = await User.findById(req.params.id, select).exec();
    if (!user) return notFound(res, 'User not found');
    return ok(res, user);
  } catch (e) {
    return serverError(res, 'Failed to fetch user');
  }
});

// PUT /api/users/:id (replace entire user)
router.put('/:id', async (req, res) => {
  try {
    const { name, email, pendingTasks } = req.body || {};
    if (!name || !email) return badRequest(res, 'name and email are required');

    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');

    // Enforce unique email (if changed)
    if (email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return badRequest(res, 'A user with this email already exists');
    }

    // Before we overwrite, we must update tasks to reflect new pendingTasks
    // 1) Unassign all tasks previously pending to this user
    const before = new Set(user.pendingTasks);
    const after = new Set(Array.isArray(pendingTasks) ? pendingTasks : []);

    const toUnassign = [...before].filter((id) => !after.has(id));
    const toAssign = [...after].filter((id) => !before.has(id));

    if (toUnassign.length) {
      await Task.updateMany(
        { _id: { $in: toUnassign }, assignedUser: String(user._id) },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );
    }
    if (toAssign.length) {
      await Task.updateMany(
        { _id: { $in: toAssign } },
        { $set: { assignedUser: String(user._id), assignedUserName: name } }
      );
    }

    user.name = name;
    user.email = email;
    user.pendingTasks = Array.isArray(pendingTasks) ? pendingTasks : [];
    await user.save();

    return ok(res, user);
  } catch (e) {
    return serverError(res, 'Failed to update user');
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');

    // Unassign the user's pending tasks
    if (user.pendingTasks.length) {
      await Task.updateMany(
        { _id: { $in: user.pendingTasks } },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );
    }

    await User.deleteOne({ _id: user._id });

    // Spec doesn’t demand a body; we can return a friendly message
    return ok(res, { _id: String(user._id) });
  } catch (e) {
    return serverError(res, 'Failed to delete user');
  }
});

module.exports = router;
