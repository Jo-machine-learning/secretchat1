const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { getLinkPreview } = require('link-preview-js'); // مكتبة معاينة الروابط

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== MongoDB Connection ======
const dbURI = "mongodb+srv://john:john@john.gevwwjw.mongodb.net/wishList?retryWrites=true&w=majority&appName=john";
mongoose.connect(dbURI).then(() => console.log('Connected to MongoDB'));

// ====== Security: Server-Side PIN ======
const SECRET_PIN = "4862";
app.post('/verify-pin', (req, res) => {
    const { pin } = req.body;
    if (pin === SECRET_PIN) res.json({ success: true });
    else res.status(401).json({ success: false, message: "Wrong PIN" });
});

// ====== Wishlist & Message Schemas ======
const messageSchema = new mongoose.Schema({
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    name: String,
    imageUrl: String,
    videoUrl: String,
    fileUrl: String,
    linkPreview: Object, // لتخزين بيانات اللينك
    highlight: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);
const Section = mongoose.model('Section', new mongoose.Schema({ name: String }));

// ====== Helper: Link Preview ======
async function fetchPreview(text) {
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
        try {
            const data = await getLinkPreview(urlMatch[0]);
            return { title: data.title, description: data.description, img: data.images[0] || data.favicons[0], url: data.url };
        } catch (e) { return null; }
    }
    return null;
}

// ====== Routes ======
app.get('/messages/:sectionId', async (req, res) => {
    const messages = await Message.find({ sectionId: req.params.sectionId }).sort({ createdAt: -1 });
    res.json(messages);
});

app.post('/messages', async (req, res) => {
    const { sectionId, name, imageUrl, videoUrl, fileUrl, highlight } = req.body;
    const preview = await fetchPreview(name); // فحص إذا كان هناك رابط
    const msg = new Message({ sectionId, name, imageUrl, videoUrl, fileUrl, highlight, linkPreview: preview });
    await msg.save();
    res.json(msg);
});

// استكمل باقي الـ routes (Delete, Put, Sections) كما هي في كودك السابق...
app.listen(3000, () => console.log('Server running on 3000'));
