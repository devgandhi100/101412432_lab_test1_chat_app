const GroupMessage = require('../models/GroupMessage');

exports.getChatHistory = async (req, res) => {
  try {
    const room = req.params.room;
    const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
