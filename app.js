
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== MongoDB Connection ======
const dbURI = "mongodb+srv://john:john@john.gevwwjw.mongodb.net/wishList?retryWrites=true&w=majority&appName=john";
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => console.error('MongoDB connection error:', err));
;

// ====== Online Users Tracking ======
const activeUsers = new Map();
const USER_TIMEOUT = 30000;

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, lastActive] of activeUsers.entries()) {
    if (now - lastActive > USER_TIMEOUT) {
      activeUsers.delete(sessionId);
    }
  }
}, 10000);

// ====== Serve Frontend ======
app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ====== Heartbeat Endpoint ======
app.post('/heartbeat', (req, res) => {
  const sessionId = req.ip + req.headers['user-agent'];
  activeUsers.set(sessionId, Date.now());
  res.status(204).end();
});

// ====== Online Users Endpoint ======
app.get('/online-users', (req, res) => {
  res.json({ count: activeUsers.size });
});

// ====== Wishlist Schema ======
const wishlistSchema = new mongoose.Schema({
  name: String,
  imageUrl: String,
  videoUrl: String,
  fileUrl: String,

  // ⭐ NEW — Highlight support
  highlight: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// ====== Routes ======

// GET all items
app.get('/wishlist', async (req, res) => {
  try {
    const items = await Wishlist.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist items' });
  }
});

// POST new item
app.post('/wishlist', async (req, res) => {
  try {
    const { name, imageUrl, videoUrl, fileUrl, highlight } = req.body;

    const newItem = new Wishlist({
      name,
      imageUrl,
      videoUrl,
      fileUrl,

      // ⭐ NEW
      highlight: highlight || false
    });

    await newItem.save();
    res.json(newItem);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// ⭐ NEW — PUT update item (for edit message)
app.put('/wishlist/:id', async (req, res) => {
  try {
    const { name } = req.body;

    const updated = await Wishlist.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    res.json(updated);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item
app.delete('/wishlist/:id', async (req, res) => {
  try {
    await Wishlist.findByIdAndDelete(req.params.id);
    res.status(200).send('Item deleted successfully');
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});


const sectionSchema = new mongoose.Schema({
  name: String,

  pinned: { type: Boolean, default: true }, // ⭐ مهم ولا مخفي
  order: { type: Number, default: 0 },      // 🔢 ترتيب السكشن

  createdAt: { type: Date, default: Date.now }
});

const Section = mongoose.model('Section', sectionSchema);


const messageSchema = new mongoose.Schema({
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  name: String,
  imageUrl: String,
  videoUrl: String,
  fileUrl: String,
  highlight: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);
// GET جميع السكشنات
app.get('/sections', async (req, res) => {
  const sections = await Section.find().sort({ order: 1 });

  res.json(sections);
});

// POST سكشن جديد
app.post('/sections', async (req, res) => {
  const { name } = req.body;
  const count = await Section.countDocuments();

const section = new Section({
  name,
  pinned: true,
  order: count
});
;
  await section.save();
  res.json(section);
});

// DELETE سكشن
app.delete('/sections/:id', async (req, res) => {
  const sec = await Section.findById(req.params.id);
  if (!sec) return res.status(404).json({ error: 'Section not found' });

  await Message.deleteMany({ sectionId: sec._id });
  await sec.deleteOne();

  res.json({ success: true });
});


// GET رسائل سكشن محدد
app.get('/messages/:sectionId', async (req, res) => {
  const messages = await Message.find({ sectionId: req.params.sectionId }).sort({ createdAt: -1 });
  res.json(messages);
});

// POST رسالة جديدة في سكشن
app.post('/messages', async (req, res) => {
  const { sectionId, name, imageUrl, videoUrl, fileUrl, highlight } = req.body;
  const msg = new Message({
    sectionId,
    name,
    imageUrl,
    videoUrl,
    fileUrl,
    highlight: highlight || false
  });
  await msg.save();
  res.json(msg);
});


// تعديل رسالة داخل سكشن
app.put('/messages_direct/:id', async (req, res) => {
    try {
        const updated = await Message.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
        res.json(updated);
    } catch (e) { res.status(500).send(e); }
});

// مسح رسالة داخل سكشن
app.delete('/messages_direct/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).send(e); }
});
app.put('/sections/:id/pin', async (req, res) => {
  const { pinned } = req.body;

  const updated = await Section.findByIdAndUpdate(
    req.params.id,
    { pinned },
    { new: true }
  );

  res.json(updated);
});
app.put('/sections/:id/move', async (req, res) => {
    const { direction } = req.body; // 1 for down, -1 for up
    const current = await Section.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Not found' });

    // البحث عن السكشن الذي سأتبادل معه المكان
    const target = await Section.findOne({
        order: current.order + direction
    });

    if (target) {
        // تبديل الأرقام
        const tempOrder = current.order;
        current.order = target.order;
        target.order = tempOrder;
        
        await current.save();
        await target.save();
    } else {
        // إذا لم يجد هدف (مثلاً أول سكشن وبتحرك لورا)، نقوم بتحديث الـ order فقط لضمان التسلسل
        current.order += direction;
        await current.save();
    }

    res.json({ success: true });
});

// ====== Start Server ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
