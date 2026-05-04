const fs = require('fs');
let c = fs.readFileSync('src/pages/Debug.jsx', 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync('src/pages/Debug.jsx', c);
