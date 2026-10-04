// MongoDB is optional: without MONGODB_URI the game runs fine, just without stats.
const dns = require('dns');
const mongoose = require('mongoose');
const { teamOf } = require('./game/roles');

let ready = false;

const roleStat = { games: { type: Number, default: 0 }, wins: { type: Number, default: 0 } };
const userSchema = new mongoose.Schema(
  {
    playerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    games: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    byRole: {
      MAFIA: roleStat,
      VILLAGER: roleStat,
      DOCTOR: roleStat,
      DETECTIVE: roleStat,
    },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MONGODB_URI not set â€” stats are disabled');
    return false;
  }
  const connect = () => mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    try {
      await connect();
    } catch (err) {
      // Some routers/ISPs refuse SRV lookups from Node's resolver; retry via public DNS.
      if (!/querySrv|ENOTFOUND|ECONNREFUSED/.test(err.message)) throw err;
      console.log('SRV lookup failed, retrying with public DNS…');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      await mongoose.disconnect().catch(() => {});
      await connect();
    }
    ready = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed — stats are disabled:', err.message);
  }
  return ready;
}

// Called once when a game ends. Never throws: a DB problem must not break the game.
async function recordGame(room) {
  if (!ready) return;
  try {
    const ops = room.players
      .filter((p) => !p.bot && p.role)
      .map((p) => {
        const won = teamOf(p.role) === room.winner;
        return {
          updateOne: {
            filter: { playerId: p.id },
            update: {
              $set: { name: p.name },
              $inc: {
                games: 1,
                wins: won ? 1 : 0,
                losses: won ? 0 : 1,
                [`byRole.${p.role}.games`]: 1,
                [`byRole.${p.role}.wins`]: won ? 1 : 0,
              },
            },
            upsert: true,
          },
        };
      });
    if (ops.length) await User.bulkWrite(ops);
  } catch (err) {
    console.error('Failed to record stats:', err.message);
  }
}

async function leaderboard(limit = 20) {
  if (!ready) return [];
  const rows = await User.find({ games: { $gt: 0 } }, { _id: 0, playerId: 0 })
    .sort({ wins: -1, games: 1 })
    .limit(limit)
    .lean();
  return rows.map((r) => ({ name: r.name, games: r.games, wins: r.wins, losses: r.losses }));
}

async function getStats(playerId) {
  if (!ready) return null;
  return User.findOne({ playerId }, { _id: 0, playerId: 0, __v: 0 }).lean();
}

const isReady = () => ready;

module.exports = { connectDb, recordGame, leaderboard, getStats, isReady };
