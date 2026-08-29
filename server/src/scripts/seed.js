import { connectDb, disconnectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Signature } from '../models/Signature.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { hashLookup } from '../lib/crypto.js';

const DEMO_EMAIL = 'demo@signoff.app';
const DEMO_PASSWORD = 'Signoff123';

async function run() {
  await connectDb();

  // Start clean. Rotating the encryption keys (npm run keys) makes existing
  // rows undecryptable and changes the email blind-index, which otherwise
  // leaves orphaned "demo" users behind. A dev seed just resets everything.
  await Promise.all([
    User.deleteMany({}),
    Signature.deleteMany({}),
    RefreshToken.deleteMany({}),
    PendingRegistration.deleteMany({})
  ]);

  const user = new User({ email: DEMO_EMAIL, name: 'Example Data', emailHash: hashLookup(DEMO_EMAIL) });
  await user.setPassword(DEMO_PASSWORD);
  await user.save();

  await Signature.create({
    userId: user._id,
    label: 'Work signature',
    fullName: 'Example Data',
    role: 'Product Manager',
    company: 'Example Co',
    email: 'example.data@example.com',
    phone: '+1 (555) 012-3456',
    location: 'San Francisco, CA, USA',
    website: 'example.com',
    tagline: 'Building better products, one release at a time.',
    social: {
      linkedin: 'linkedin.com/in/example-data',
      x: 'x.com/example-data',
      instagram: 'instagram.com/example.data',
      youtube: ''
    },
    templateId: 'mirra',
    animationId: 'shatter',
    accent: '#1D9BF0',
    avatarShape: 'circle',
    verified: true
  });

  console.log(`\nDemo account ready\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}\n`);
  await disconnectDb();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
