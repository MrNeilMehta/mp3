const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'User name is required'] },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
    },
    pendingTasks: { type: [String], default: [] },
    dateCreated: { type: Date, default: Date.now }
}, { versionKey: false });

UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
