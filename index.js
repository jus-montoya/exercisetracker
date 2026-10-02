// 1. MUST BE AT THE VERY TOP
require('dotenv').config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Connect using process.env.MONGO_URI
mongoose.connect(process.env.MONGO_URI);

// Schemas & Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 1. Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const user = await newUser.save();
    res.json({
      username: user.username,
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// 2. Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 3. Add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });

    const exerciseDate = date ? new Date(date) : new Date();

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// 4. Get a user's exercise log (with optional from, to, limit filters)
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });

    let dateObj = {};
    if (from) dateObj['$gte'] = new Date(from);
    if (to) dateObj['$lte'] = new Date(to);

    let filter = { userId: userId };
    if (from || to) {
      filter.date = dateObj;
    }

    let query = Exercise.find(filter);
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const exercises = await query.exec();

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// Listener
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});