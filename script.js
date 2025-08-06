const SPREADSHEET_ID = '1Q99y9K81cI0zVoRfso2JPuIX2IlWgNkRFaZs1RKkoIU';
const TIMETABLE_RANGE = 'Timetable!A1:Z100';
const CONTACTS_RANGE = 'Contacts!A1:B300';
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
              <a href="${tel}" title="Call ${name}" class="icon-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#4CAF50" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.2.48 2.5.74 3.83.74a1 1 0 011 1v3.5a1 1 0 01-1 1A17.91 17.91 0 013 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.33.26 2.63.74 3.83a1 1 0 01-.21 1.11l-2.41 2.41z"/>
                </svg>
              </a>
              
              <a href="${wa}" title="WhatsApp ${name}" class="icon-link" target="_blank">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#25D366" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 00-8.64 15.22L2 22l4.95-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.2-1.2l-.3-.2-2.9.8.8-2.9-.2-.3A8 8 0 1112 20zm4.47-5.73c-.26-.13-1.53-.75-1.77-.83s-.41-.13-.58.13-.66.83-.81 1-.3.2-.56.07a6.56 6.56 0 01-1.94-1.2 7.24 7.24 0 01-1.34-1.67c-.14-.25 0-.39.1-.52s.25-.3.37-.46a1.7 1.7 0 00.25-.42.48.48 0 00-.02-.45c-.07-.13-.57-1.36-.78-1.86s-.42-.43-.57-.44h-.48a.92.92 0 00-.67.32A2.79 2.79 0 006.5 9.4a4.85 4.85 0 00.28 1.7c.3.8.9 1.55 1 1.66s1.92 2.9 4.63 3.87a5.33 5.33 0 002.45.5 2.28 2.28 0 001.5-.7 1.9 1.9 0 00.42-1.32c-.06-.12-.24-.2-.5-.34z"/>
                </svg>
              </a>

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
