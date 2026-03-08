// Generate bcrypt hashes for 002_seed.sql. Run: node scripts/generate-hashes.js
const bcrypt = require('bcryptjs');
const pairs = [
  ['admin', 'admin@007'],
  ['poki', 'pokihanma@007'],
  ['demo', 'demo007'],
];
const cost = 12;
for (const [name, pass] of pairs) {
  const hash = bcrypt.hashSync(pass, cost);
  console.log(name + ':', hash);
}
