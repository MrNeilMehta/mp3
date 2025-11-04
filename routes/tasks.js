const express = require('express');
const Task = require('../models/Task');
const User = require('../models/user');
const parseQuery = require('../middleware/queryParser');
const { ok, created, badRequest, notFound, serverError } = require('../utils/responses');

const router = express.Router();

// Helper to sync user.pendingTasks with a single task
async function syncPendingForTask(taskDoc) {
  // if task is completed → ensure it is NOT in pendingTasks
  // if task is not completed and assignedUser is set → ensure it IS in that user's pendingTasks
  // if no assignedUser → ensure it is absent from all users' pendingTasks (safety)
  const taskIdStr = String(taskDoc._id);

  if (!taskDoc.assignedUser) {
    await User.updateMany(
      { pendingTasks: taskIdStr },
      { $pull: { pendingTasks: taskIdStr } }
    );
    return;
  }

  const user = await User.findById(taskDoc.assignedUser);
  if (!user) return; // If dangling, skip

  const shouldBePending = !taskDoc.completed;
  if (shouldBePending) {
    // add if missing
    if (!user.pendingTasks.includes(taskIdStr)) {
      user.pendingTasks.push(taskIdStr);
      await user.save();
    }
  } else {
    // remove if present
    if (user.pendingTasks.includes(taskIdStr)) {
      user.pendingTasks = user.pendingTasks.filter((id) => id !== taskIdStr);
      await user.save();
    }
  }
}

// GET /api/tasks
router.get('/', parseQuery, async (req, res) => {
  try {
    const { where, sort, select, skip, limit, count } = req.parsedQuery;
    let q = Task.find(where, select);
    if (sort) q = q.sort(sort);
    if (typeof skip === 'number') q = q.skip(skip);
    // MP says default limit 100 for tasks
    q = q.limit(typeof limit === 'number' ? limit : 100);

    if (count) {
      const c = await Task.countDocuments(where);
      return ok(res, c);
    }
    const tasks = await q.exec();
    return ok(res, tasks);
  } catch (e) {
    return serverError(res, 'Failed to fetch tasks');
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description = '',
      deadline,
      completed = false,
      assignedUser = '',
      assignedUserName
    } = req.body || {};

    if (!name || !deadline) return badRequest(res, 'name and deadline are required');

    let finalAssignedUser = assignedUser;
    let finalAssignedUserName = assignedUserName;

    if (finalAssignedUser) {
      const user = await User.findById(finalAssignedUser);
      if (!user) return badRequest(res, 'assignedUser does not exist');
      // If name not provided, derive it; otherwise trust provided (must still be consistent)
      finalAssignedUserName = finalAssignedUserName || user.name;
    } else {
      finalAssignedUser = '';
      finalAssignedUserName = 'unassigned';
    }

    const task = await Task.create({
      name,
      description,
      deadline,
      completed,
      assignedUser: finalAssignedUser,
      assignedUserName: finalAssignedUserName
    });

    await syncPendingForTask(task);
    return created(res, task);
  } catch (e) {
    return serverError(res, 'Failed to create task');
  }
});

// GET /api/tasks/:id (supports ?select=)
router.get('/:id', parseQuery, async (req, res) => {
  try {
    const { select } = req.parsedQuery;
    const task = await Task.findById(req.params.id, select).exec();
    if (!task) return notFound(res, 'Task not found');
    return ok(res, task);
  } catch (e) {
    return serverError(res, 'Failed to fetch task');
  }
});

// PUT /api/tasks/:id (replace entire task)
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description = '',
      deadline,
      completed = false,
      assignedUser = '',
      assignedUserName
    } = req.body || {};

    if (!name || !deadline) return badRequest(res, 'name and deadline are required');

    const task = await Task.findById(req.params.id);
    if (!task) return notFound(res, 'Task not found');

    let finalAssignedUser = assignedUser;
    let finalAssignedUserName = assignedUserName;

    if (finalAssignedUser) {
      const user = await User.findById(finalAssignedUser);
      if (!user) return badRequest(res, 'assignedUser does not exist');
      finalAssignedUserName = finalAssignedUserName || user.name;
    } else {
      finalAssignedUser = '';
      finalAssignedUserName = 'unassigned';
    }

    // If task was previously assigned to someone else, remove from their pendingTasks
    if (task.assignedUser && task.assignedUser !== finalAssignedUser) {
      await User.updateOne(
        { _id: task.assignedUser },
        { $pull: { pendingTasks: String(task._id) } }
      );
    }

    task.name = name;
    task.description = description;
    task.deadline = deadline;
    task.completed = completed;
    task.assignedUser = finalAssignedUser;
    task.assignedUserName = finalAssignedUserName;

    await task.save();
    await syncPendingForTask(task);

    return ok(res, task);
  } catch (e) {
    return serverError(res, 'Failed to update task');
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return notFound(res, 'Task not found');

    // Remove from assigned user's pendingTasks (if present)
    if (task.assignedUser) {
      await User.updateOne(
        { _id: task.assignedUser },
        { $pull: { pendingTasks: String(task._id) } }
      );
    }

    await Task.deleteOne({ _id: task._id });
    return ok(res, { _id: String(task._id) });
  } catch (e) {
    return serverError(res, 'Failed to delete task');
  }
});

module.exports = router;
