const Pusher = require('pusher');

const pusher = new Pusher({
  appId: '2130862',
  key: '544cddc6237986c7d311',
  secret: process.env.PUSHER_SECRET,
  cluster: 'us2',
  useTLS: true
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { channel, event, data } = req.body;
  try {
    await pusher.trigger(channel, event, data);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
