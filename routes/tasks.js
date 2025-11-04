const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const parseQuery = require('../middleware/queryParser');
const { ok, created, badRequest, notFound, serverError } = require('../utils/responses');

const router = express.Router();

async function syncPending(task) {
    const id = String(task._id);

    if (!task.assignedUser) {
        await User.updateMany({ pendingTasks: id }, { $pull: { pendingTasks: id } });
        return;
    }

    const user = await User.findById(task.assignedUser);
    if (!user) return;

    if (!task.completed) {
        if (!user.pendingTasks.includes(id)) {
            user.pendingTasks.push(id);
            await user.save();
        }
    } else {
        if (user.pendingTasks.includes(id)) {
            user.pendingTasks = user.pendingTasks.filter(x => x !== id);
            await user.save();
        }
    }
}

// GET /api/tasks
router.get('/', parseQuery, async (req, res) => {
    try {
        const { where, sort, select, skip, limit, count } = req.parsedQuery;
        let query = Task.find(where, select);
        if (sort) query = query.sort(sort);
        if (skip) query = query.skip(skip);
        query = query.limit(limit || 100);

        if (count) {
            const result = await Task.countDocuments(where);
            return ok(res, result);
        }

        const tasks = await query.exec();
        return ok(res, tasks);
    } catch {
        return serverError(res, 'Error fetching tasks');
    }
});

// POST /api/tasks
router.post('/', async (req, res) => {
    try {
        const { name, description = '', deadline, completed = false, assignedUser = '', assignedUserName } = req.body;
        if (!name || !deadline) return badRequest(res, 'name and deadline are required');

        let finalUser = assignedUser;
        let finalUserName = assignedUserName;

        if (finalUser) {
            const user = await User.findById(finalUser);
            if (!user) return badRequest(res, 'assignedUser not found');
            finalUserName = finalUserName || user.name;
        } else {
            finalUser = '';
            finalUserName = 'unassigned';
        }

        const task = await Task.create({
            name,
            description,
            deadline,
            completed,
            assignedUser: finalUser,
            assignedUserName: finalUserName
        });

        await syncPending(task);
        return created(res, task);
    } catch {
        return serverError(res, 'Failed to create task');
    }
});

// GET /api/tasks/:id
router.get('/:id', parseQuery, async (req, res) => {
    try {
        const { select } = req.parsedQuery;
        const task = await Task.findById(req.params.id, select);
        if (!task) return notFound(res, 'Task not found');
        return ok(res, task);
    } catch {
        return serverError(res, 'Error retrieving task');
    }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, description = '', deadline, completed = false, assignedUser = '', assignedUserName } = req.body;
        if (!name || !deadline) return badRequest(res, 'name and deadline are required');

        const task = await Task.findById(req.params.id);
        if (!task) return notFound(res, 'Task not found');

        let finalUser = assignedUser;
        let finalUserName = assignedUserName;

        if (finalUser) {
            const user = await User.findById(finalUser);
            if (!user) return badRequest(res, 'assignedUser not found');
            finalUserName = finalUserName || user.name;
        } else {
            finalUser = '';
            finalUserName = 'unassigned';
        }

        if (task.assignedUser && task.assignedUser !== finalUser) {
            await User.updateOne({ _id: task.assignedUser }, { $pull: { pendingTasks: String(task._id) } });
        }

        task.name = name;
        task.description = description;
        task.deadline = deadline;
        task.completed = completed;
        task.assignedUser = finalUser;
        task.assignedUserName = finalUserName;

        await task.save();
        await syncPending(task);

        return ok(res, task);
    } catch {
        return serverError(res, 'Failed to update task');
    }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return notFound(res, 'Task not found');

        if (task.assignedUser) {
            await User.updateOne({ _id: task.assignedUser }, { $pull: { pendingTasks: String(task._id) } });
        }

        await Task.deleteOne({ _id: task._id });
        return ok(res, { _id: String(task._id) });
    } catch {
        return serverError(res, 'Could not delete task');
    }
});

module.exports = router;
