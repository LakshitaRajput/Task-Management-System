
const express = require('express'); // routes/apis
const mongoose = require('mongoose'); // database
const cors = require('cors'); // frontent to backend 
const jwt = require('jsonwebtoken'); // authentication
const bcrypt = require('bcryptjs'); // hashing
require('dotenv').config(); // secrets

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI).catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Member', enum: ['Admin', 'Member'] }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'Todo', enum: ['Todo', 'In Progress', 'Done'] },
  dueDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);

// Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'No token provided' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ msg: 'Unauthorized', error: e.message });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ msg: 'Admin access required' });
  }
  next();
};

// Initialize admin user
async function initializeAdmin() {
  try {
    const adminUser = await User.findOne({ email: 'admin@test.com' });
    if (adminUser && adminUser.role !== 'Admin') {
      adminUser.role = 'Admin';
      await adminUser.save();
      console.log('✓ admin@test.com role updated to Admin');
    }
  } catch (err) {
    console.error('Error initializing admin:', err.message);
  }
}

// Call initialization after a short delay to ensure DB is connected
setTimeout(initializeAdmin, 1000);

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Name, email, and password required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.status(201).json({ msg: 'User created', userId: user._id });
  } catch (err) {
    res.status(400).json({ msg: 'Signup failed', error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(400).json({ msg: 'Login failed', error: err.message });
  }
});

// Update user role (admin only)
app.patch('/api/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['Admin', 'Member'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    if (!updatedUser) return res.status(404).json({ msg: 'User not found' });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to update user role', error: err.message });
  }
});

// Project Routes
app.get('/api/projects', auth, async (req, res) => {
  try {
    let query;
    if (req.user.role === 'Admin') {
      // Admin sees all projects
      query = Project.find();
    } else {
      // Member sees only their projects (owner or member)
      query = Project.find({
        $or: [
          { owner: req.user.id },
          { members: req.user.id }
        ]
      });
    }
    const projects = await query.populate('owner', 'name email').populate('members', 'name email');
    res.json(projects);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to fetch projects', error: err.message });
  }
});

app.post('/api/projects', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ msg: 'Project name required' });
    
    const project = await Project.create({
      name,
      description,
      owner: req.user.id,
      members: [req.user.id]
    });
    
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to create project', error: err.message });
  }
});

app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    if (!project) return res.status(404).json({ msg: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to fetch project', error: err.message });
  }
});

app.patch('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only owner can update project' });
    }
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to update project', error: err.message });
  }
});

// Task Routes
app.get('/api/tasks', auth, async (req, res) => {
  try {
    let query;
    if (req.user.role === 'Admin') {
      // Admin sees all tasks
      query = Task.find();
    } else {
      // Member sees only tasks in their projects or assigned to them
      const memberProjects = await Project.find({
        $or: [
          { owner: req.user.id },
          { members: req.user.id }
        ]
      }).select('_id');
      const projectIds = memberProjects.map(p => p._id);
      
      query = Task.find({
        $or: [
          { project: { $in: projectIds } },
          { assignedTo: req.user.id }
        ]
      });
    }
    const tasks = await query
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');
    res.json(tasks);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to fetch tasks', error: err.message });
  }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { title, description, project, assignedTo, dueDate } = req.body;
    if (!title || !project) {
      return res.status(400).json({ msg: 'Title and project required' });
    }
    
    // Check if user has access to this project (for Members)
    if (req.user.role === 'Member') {
      const proj = await Project.findById(project);
      if (!proj) return res.status(404).json({ msg: 'Project not found' });
      
      const isMember = proj.members.some(m => m.toString() === req.user.id) || 
                       proj.owner.toString() === req.user.id;
      if (!isMember) {
        return res.status(403).json({ msg: 'You do not have access to this project' });
      }
    }
    
    const task = await Task.create({
      title,
      description,
      project,
      assignedTo,
      dueDate,
      createdBy: req.user.id
    });
    
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to create task', error: err.message });
  }
});

app.patch('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    
    // Check authorization for Members
    if (req.user.role === 'Member') {
      const project = await Project.findById(task.project);
      const isMember = project.members.some(m => m.toString() === req.user.id) || 
                       project.owner.toString() === req.user.id;
      if (!isMember) {
        return res.status(403).json({ msg: 'You do not have access to this task' });
      }
    }
    
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to update task', error: err.message });
  }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    
    // Check authorization for Members
    if (req.user.role === 'Member') {
      const project = await Project.findById(task.project);
      const isMember = project.members.some(m => m.toString() === req.user.id) || 
                       project.owner.toString() === req.user.id;
      if (!isMember) {
        return res.status(403).json({ msg: 'You do not have access to this task' });
      }
    }
    
    const deleted = await Task.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Task deleted' });
  } catch (err) {
    res.status(400).json({ msg: 'Failed to delete task', error: err.message });
  }
});

// Dashboard Route
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    let taskQuery;
    
    if (req.user.role === 'Admin') {
      // Admin sees all tasks
      taskQuery = {};
    } else {
      // Member sees only tasks in their projects or assigned to them
      const memberProjects = await Project.find({
        $or: [
          { owner: req.user.id },
          { members: req.user.id }
        ]
      }).select('_id');
      const projectIds = memberProjects.map(p => p._id);
      
      taskQuery = {
        $or: [
          { project: { $in: projectIds } },
          { assignedTo: req.user.id }
        ]
      };
    }
    
    const totalTasks = await Task.countDocuments(taskQuery);
    const completedTasks = await Task.countDocuments({ ...taskQuery, status: 'Done' });
    const inProgressTasks = await Task.countDocuments({ ...taskQuery, status: 'In Progress' });
    const todoTasks = await Task.countDocuments({ ...taskQuery, status: 'Todo' });
    const myTasks = await Task.countDocuments({ ...taskQuery, assignedTo: req.user.id });
    const overdueTasks = await Task.countDocuments({
      ...taskQuery,
      status: { $ne: 'Done' },
      dueDate: { $lt: new Date() }
    });
    
    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      myTasks,
      overdueTasks
    });
  } catch (err) {
    res.status(400).json({ msg: 'Failed to fetch dashboard', error: err.message });
  }
});

app.listen(process.env.PORT || 5000, () => console.log(`Server running on port ${process.env.PORT || 5000}`));
process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Promise Rejection:", err.message);
});