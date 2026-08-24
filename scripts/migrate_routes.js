const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '../src/app/dashboard');

const routeMoves = [
  // Field Ops
  { src: 'live-map', dest: 'field-ops/live-map' },
  { src: 'schedules', dest: 'field-ops/calendar' },
  
  // Inventory
  { src: 'inventory', dest: 'inventory/catalog' },
  
  // Comms
  { src: 'tickets', dest: 'comms/tickets' },
  { src: 'warnings', dest: 'comms/warnings' },
  
  // Workforce
  { src: 'employees', dest: 'workforce/directory' },
  { src: 'audit-logs', dest: 'workforce/audit-logs' },
  { src: 'leaves', dest: 'workforce/leaves' },
  { src: 'attendance', dest: 'workforce/attendance-deprecated' }, // moving out of root
  
  // System
  { src: 'ceo-overrides', dest: 'system/ceo-overrides' },
  { src: 'settings', dest: 'system/geofence' }
];

console.log('Starting Route Migration...');

// 1. Create Pillar Directories
const pillars = ['field-ops', 'inventory', 'comms', 'workforce', 'system'];
pillars.forEach(pillar => {
  const pillarPath = path.join(DASHBOARD_DIR, pillar);
  if (!fs.existsSync(pillarPath)) {
    fs.mkdirSync(pillarPath, { recursive: true });
    console.log(`Created pillar directory: ${pillar}`);
  }
});

// 2. Move Folders
routeMoves.forEach(({ src, dest }) => {
  const srcPath = path.join(DASHBOARD_DIR, src);
  const destPath = path.join(DASHBOARD_DIR, dest);
  
  if (fs.existsSync(srcPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    try {
      fs.renameSync(srcPath, destPath);
      console.log(`Moved: ${src} -> ${dest}`);
    } catch (e) {
      console.error(`Failed to move ${src}:`, e.message);
    }
  } else {
    console.log(`Skip: ${src} does not exist`);
  }
});

console.log('\nMigration Complete.');
