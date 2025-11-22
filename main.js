const readline = require('readline');
const db = require('./db');
require('./events/logger'); // Initialize event logger

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ----------------- Helpers -----------------
const fs = require('fs');
const path = require('path');

// -------- Backup Helper --------
function createBackup(vault) {
  if (!Array.isArray(vault)) return;

  const backupDir = path.join(__dirname, 'backups');

  // Create backups folder if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').split('.')[0]; // YYYY-MM-DDTHH-MM-SS
  const backupFileName = `backup_${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFileName);

  fs.writeFileSync(backupPath, JSON.stringify(vault, null, 2), 'utf-8');
  console.log(`✅ Backup created successfully: ${backupFileName}`);
}
// -------- End Backup Helper --------

// -------- Export Helper --------
function exportVaultData(vault) {
  if (!Array.isArray(vault) || vault.length === 0) {
    console.log("\nVault is empty. Nothing to export.\n");
    return;
  }

  const fileName = 'export.txt';
  const filePath = path.join(__dirname, fileName);

  const now = new Date();
  const header = `Vault Export\nDate: ${now.toLocaleString()}\nTotal Records: ${vault.length}\nFile: ${fileName}\n\n`;

  const recordsText = vault.map((r, idx) => {
    const created = r.created ? r.created : 'N/A';
    return `${idx + 1}. ID: ${r.id} | Name: ${r.name} | Created: ${created}`;
  }).join('\n');

  fs.writeFileSync(filePath, header + recordsText, 'utf-8');
  console.log(`\n✅ Data exported successfully to ${fileName}\n`);
}
// -------- End Export Helper --------

// -------- Sorting Helper --------
function sortRecords() {
  const vault = db.listRecords();
  if (!Array.isArray(vault) || vault.length === 0) {
    console.log("\nVault is empty. Nothing to sort.\n");
    menu();
    return;
  }

  const readlineSync = require('readline-sync');

  const fieldChoice = readlineSync.question(
    'Choose field to sort by (name/created): '
  ).trim().toLowerCase();

  if (!['name', 'created'].includes(fieldChoice)) {
    console.log('Invalid field choice. Returning to menu.\n');
    menu();
    return;
  }

  const orderChoice = readlineSync.question(
    'Choose order (asc/desc): '
  ).trim().toLowerCase();

  if (!['asc', 'desc'].includes(orderChoice)) {
    console.log('Invalid order choice. Returning to menu.\n');
    menu();
    return;
  }

  const sortedVault = [...vault];
  sortedVault.sort((a, b) => {
    let valA = a[fieldChoice] ? a[fieldChoice].toString().toLowerCase() : '';
    let valB = b[fieldChoice] ? b[fieldChoice].toString().toLowerCase() : '';

    if (fieldChoice === 'created') {
      valA = new Date(valA);
      valB = new Date(valB);
    }

    if (valA < valB) return orderChoice === 'asc' ? -1 : 1;
    if (valA > valB) return orderChoice === 'asc' ? 1 : -1;
    return 0;
  });

  console.log(`\nSorted Records (${fieldChoice}, ${orderChoice.toUpperCase()}):`);
  sortedVault.forEach((r, idx) => {
    const created = r.created ? r.created : 'N/A';
    console.log(`${idx + 1}. ID: ${r.id} | Name: ${r.name} | Created: ${created}`);
  });
  console.log('');
  menu();
}
// -------- End Sorting Helper --------

// -------- Search Helper --------
function searchRecords() {
  const vault = db.listRecords();
  if (!Array.isArray(vault) || vault.length === 0) {
    console.log("\nVault is empty. No records to search.\n");
    menu();
    return;
  }

  rl.question('\nEnter search keyword (ID or Name): ', keyword => {
    const kw = keyword.trim().toLowerCase();
    if (kw.length === 0) {
      console.log("No keyword entered. Returning to menu.\n");
      menu();
      return;
    }

    const matches = vault.filter(rec => {
      const recId = rec.id ? String(rec.id).toLowerCase() : '';
      const recName = rec.name ? String(rec.name).toLowerCase() : '';
      return recId.includes(kw) || recName.includes(kw);
    });

    if (matches.length === 0) console.log("\nNo records found.\n");
    else {
      console.log(`\nFound ${matches.length} matching record${matches.length > 1 ? 's' : ''}:`);
      matches.forEach((r, idx) => {
        const created = r.created ? r.created : 'N/A';
        console.log(`${idx + 1}. ID: ${r.id} | Name: ${r.name} | Created: ${created}`);
      });
      console.log('');
    }
    menu();
  });
}
// -------- End Search Helper --------

// ----------------- Main Menu -----------------
function menu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Search Records
6. Sort Records
7. Export Data
8. Exit
=====================
  `);

  rl.question('Choose option: ', ans => {
    switch (ans.trim()) {
      case '1':
        rl.question('Enter name: ', name => {
          rl.question('Enter value: ', value => {
            db.addRecord({ name, value });
            console.log('✅ Record added successfully!');
            createBackup(db.listRecords()); // <-- backup after adding
            menu();
          });
        });
        break;

      case '2':
        const records = db.listRecords();
        if (records.length === 0) console.log('No records found.');
        else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
        menu();
        break;

      case '3':
        rl.question('Enter record ID to update: ', id => {
          rl.question('New name: ', name => {
            rl.question('New value: ', value => {
              const updated = db.updateRecord(Number(id), name, value);
              console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
              menu();
            });
          });
        });
        break;

      case '4':
        rl.question('Enter record ID to delete: ', id => {
          const deleted = db.deleteRecord(Number(id));
          console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
          if (deleted) createBackup(db.listRecords()); // <-- backup after deletion
          menu();
        });
        break;

      case '5':
        searchRecords();
        break;

      case '6':
        sortRecords();
        break;

      case '7':
        exportVaultData(db.listRecords());
        menu();
        break;

      case '8':
        console.log('👋 Exiting NodeVault...');
        rl.close();
        break;

      default:
        console.log('Invalid option.');
        menu();
    }
  });
}

// ----------------- Start App -----------------
menu();

