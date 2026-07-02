import dns from 'dns';
import mongoose from 'mongoose';
import config from './index.js';

// Node's DNS resolver can fail on Windows with some ISPs (querySrv ECONNREFUSED).
// Override with DNS_SERVERS=8.8.8.8,1.1.1.1 in .env if needed.
const dnsServers = process.env.DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
if (dnsServers?.length) {
  dns.setServers(dnsServers);
} else if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.db.uri, {
      autoIndex: config.env !== 'production',
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

export default connectDB;
