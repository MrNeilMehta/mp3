const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');

const router = express.Router();

const safeParseJSON = (raw, fallback = {}) => {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); }
  catch { return fallback; }
};

const asInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const sendOk = (res, data) => res.status(200).json({ message: 'OK', data });
const sendCreated = (res, data) => res.status(201).json({ message: 'Created', data });
const sendBad = (res, msg) => res.status(400).json({ message: msg, data: null });
const sendNotFound = (res, msg = 'Not found') => res.status(404).json({ message: msg, data: null });
const sendServerErr = (res, msg = 'Server error') => res.status(500).json({ message: msg, data: null });

// =======================
// GET /api/users
// =======================
router.get('/', async (req, res) => {
  try {
    const where = safeParseJSON(req.query.where, {});
    const sort = safeParseJSON(req.query.sort, null);
    const select = safeParseJSON(req.query.select, null);
    const skip = asInt(req.query.skip, 0);
    const limit = asInt(req.query.limit, 100);
    const count = req.query.count === 'true';

    if (count) return sendOk(res, await User.countDocuments(where));

    let q = User.find(where);
    if (sort) q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip) q = q.skip(skip);
    if (limit) q = q.limit(limit);

    return sendOk(res, await q.exec());
  } catch {
    return sendServerErr(res);
  }
});

// =======================
// GET /api/users/:id
// =======================
router.get('/:id', async (req, res) => {
  try {
    const select = safeParseJSON(req.query.select, null);
    const doc = await User.findById(req.params.id).select(select || undefined);
    if (!doc) return sendNotFound(res);
    return sendOk(res, doc);
  } catch {
    return sendServerErr(res);
  }
});

// =======================
// POST /api/users
// =======================
router.post('/', async (req, res) => {
  try {
    const { name, email, pendingTasks } = req.body;

    if (!name || !email) return sendBad(res, 'Name and email are required');

    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) return sendBad(res, 'Email already exists');

    const user = new User({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      pendingTasks: Array.isArray(pendingTasks) ? pendingTasks : []
    });

    await user.save();
    return sendCreated(res, user);
  } catch {
    return sendServerErr(res);
  }
});

// =======================
// PUT /api/users/:id
// =======================
router.put('/:id', async (req, res) => {
  try {
    const { name, email, pendingTasks } = req.body;

    if (!name || !email) return sendBad(res, 'Name and email are required');

    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res);

    const duplicate = await User.findOne({
      email: String(email).toLowerCase().trim(),
      _id: { $ne: user._id }
    });

    if (duplicate) return sendBad(res, 'Email already exists');

    const prevTasks = new Set(user.pendingTasks.map(String));
    const nextTasks = new Set((pendingTasks || []).map(String));

    const toAssign = [...nextTasks];
    const toUnassign = [...prevTasks].filter(x => !nextTasks.has(x));

    // Update task → user assignments
    await Task.updateMany(
      { _id: { $in: toAssign } },
      { $set: { assignedUser: user._id, assignedUserName: name } }
    );

    if (toUnassign.length) {
      await Task.updateMany(
        { _id: { $in: toUnassign } },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );
    }

    user.name = name.trim();
    user.email = email.toLowerCase().trim();
    user.pendingTasks = [...nextTasks];

    await user.save();
    return sendOk(res, user);
  } catch {
    return sendServerErr(res);
  }
});

// =======================
// DELETE /api/users/:id
// =======================
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res);

    if (user.pendingTasks?.length) {
      await Task.updateMany(
        { _id: { $in: user.pendingTasks } },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );
    }

    await user.deleteOne();
    return sendOk(res, null);
  } catch {
    return sendServerErr(res);
  }
});

module.exports = router;
