const SPREADSHEET_ID = '1Q99y9K81cI0zVoRfso2JPuIX2IlWgNkRFaZs1RKkoIU';
const TIMETABLE_RANGE = 'Timetable!A1:Z31';
const CONTACTS_RANGE = 'Contacts!A1:B100';
const API_KEY = 'AIzaSyCuQd0yaWz9dQ7_3MBXKt7WV9MIRo4h7kU';

// Add formatted date to header
const today = new Date();
const formattedDate = today.toLocaleDateString('en-MY', {
  weekday: 'long',
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});
document.querySelector('#header-title').innerHTML += `<br><small style="font-weight: normal;">${formattedDate}</small>`;

function formatTodayAsDDMMYYYY() {
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function fetchSheetData(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch range ${range}:`, res.status, await res.text());
    return [];
  }
  const data = await res.json();
  return data.values || [];
}

async function loadDashboard() {
  const timetable = await fetchSheetData(TIMETABLE_RANGE);
  const contacts = await fetchSheetData(CONTACTS_RANGE);

  const container = document.getElementById('doctor-list');
  if (!container) return;

  if (!timetable.length || !contacts.length) {
    container.innerHTML = '<p>No data found in the sheets.</p>';
    return;
  }

  const todayStr = formatTodayAsDDMMYYYY();
  const headers = timetable[0].slice(1); // skip "Date"
  const todayRow = timetable.find(row => row[0] === todayStr);

  if (!todayRow) {
    container.innerHTML = `<p>No on-call schedule found for today (${todayStr}).</p>`;
    return;
  }

  const contactsMap = {};
  contacts.forEach(([name, phone]) => {
    if (name && phone) contactsMap[name.trim()] = phone.trim();
  });

  const grouped = {}; // { RESQ: { AM: [...], PM: [...] }, etc. }

  headers.forEach((dept, i) => {
    const cell = todayRow[i + 1];
    if (!cell) return;

    const doctors = cell.split(/\r?\n/).map(d => d.trim()).filter(Boolean);
    if (!doctors.length) return;

    const parts = dept.split(' ');
    const main = parts[0].toUpperCase();
    const sub = dept.slice(main.length).trim();

    if (!grouped[main]) grouped[main] = {};
    const subkey = sub || 'General';

    if (!grouped[main][subkey]) grouped[main][subkey] = [];

    doctors.forEach(name => {
      const phone = contactsMap[name] || 'Unknown';
      grouped[main][subkey].push({ name, phone });
    });
  });

  // Render HTML
  let html = '';
  Object.entries(grouped).forEach(([mainDept, subGroups]) => {
    html += `<div class="doctor-card"><h2>${mainDept}</h2>`;

    Object.entries(subGroups).forEach(([subDept, doctors]) => {
      if (subDept !== 'General') {
        html += `<h3>${subDept}</h3>`;
      }

      doctors.forEach(({ name, phone }) => {
        const tel = phone !== 'Unknown' ? `tel:${phone}` : '#';
        const wa = phone !== 'Unknown' ? `https://wa.me/6${phone.replace(/\D/g, '')}` : '#';

        html += `
          <div class="doctor-row">
            <div class="doctor-info">
              <strong>${name}</strong>
              <span>${phone}</span>
            </div>
            <div class="contact-icons">
              <a href="${tel}" title="Call ${name}">📞</a>
              <a href="${wa}" title="WhatsApp ${name}" target="_blank">💬</a>
            </div>
          </div>
        `;
      });
    });

    html += `</div>`;
  });

  container.innerHTML = html || '<p>No doctors on-call today.</p>';
}

document.addEventListener('DOMContentLoaded', loadDashboard);
