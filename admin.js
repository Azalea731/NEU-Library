const SUPABASE_URL = 'https://jbtsirdrynfvwjsuzwlj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidHNpcmRyeW5mdndqc3V6d2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk1NjIsImV4cCI6MjA4OTMyNTU2Mn0.CxcXWnCr_zTdYVBLgyx9R83tE0aw352y4mTZTOO2-wY';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const collegeNames = {
    'gr-school': 'MBA',
    's-law':     'M.Ed.',
    'eteeap':    'ETEEAP',
    'tesda':     'Alt. Learning System',
    'cir':       "Int'l Relations",
    'intr':      'Integrated School',
    'ca':        'Accountancy',
    'cas':       'Arts and Sciences',
    'cag':       'Agriculture',
    'cba':       'Business Administration',
    'ccom':      'Communication',
    'ccrim':     'Criminology',
    'ced':       'Education',
    'cea':       'Engineering & Architecture',
    'cics':      'CICS',
    'cm':        'Medicine',
    'cmt':       'Medical Technology',
    'cmid':      'Midwifery',
    'cmus':      'Music',
    'cn':        'Nursing',
    'cpt':       'Physical Therapy',
    'crt':       'Respiratory Therapy',
};

// On load: check session and verify admin, otherwise boot back to login
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_type, email')
        .eq('id', session.user.id)
        .single();

    if (profile && profile.user_type === 'admin') {
        showDashboard(profile.email);
    } else {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    }
});

document.getElementById('viewToggle').addEventListener('change', function () {
    if (this.checked) {
        window.location.href = 'homepage.html';
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
});

function showDashboard(email) {
    document.getElementById('sidebarEmail').textContent = email;
    document.getElementById('lastUpdated').textContent  =
        'Last updated: ' + new Date().toLocaleString('en-PH', {
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    loadStats();
    applyFilters();
}

let TS_COL = null;

async function detectTimestampColumn() {
    if (TS_COL) return TS_COL;
    const { data, error } = await supabaseClient.from('visit_logs').select('*').limit(1);
    if (error || !data || data.length === 0) { TS_COL = 'created_at'; return TS_COL; }
    const keys = Object.keys(data[0]);
    for (const candidate of ['created_at', 'inserted_at', 'timestamp', 'visit_date', 'date']) {
        if (keys.includes(candidate)) { TS_COL = candidate; return TS_COL; }
    }
    for (const k of keys) {
        if (data[0][k] && !isNaN(Date.parse(data[0][k]))) { TS_COL = k; return TS_COL; }
    }
    TS_COL = 'created_at';
    return TS_COL;
}

async function fetchVisits(filters = {}) {
    const tsCol = await detectTimestampColumn();
    let query = supabaseClient.from('visit_logs').select('*').order(tsCol, { ascending: false });
    if (filters.from)     query = query.gte(tsCol, filters.from.toISOString());
    if (filters.to)       query = query.lt(tsCol, filters.to.toISOString());
    if (filters.reason)   query = query.eq('reason', filters.reason);
    if (filters.college)  query = query.eq('college', filters.college);
    if (filters.userType) query = query.eq('user_type', filters.userType);
    const { data, error } = await query;
    if (error) {
        document.getElementById('tableBody').innerHTML =
            `<tr><td colspan="7" class="empty-row" style="color:var(--red)">Database error: ${error.message}</td></tr>`;
        document.getElementById('resultCount').textContent = 'Error';
        return [];
    }
    return data || [];
}

async function loadStats() {
    const all = await fetchVisits();
    const tsCol = TS_COL || 'created_at';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow   = new Date(todayStart.getTime() + 86400000);
    const dayOfWeek  = now.getDay();
    const weekStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const weekEnd    = new Date(weekStart.getTime() + 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    function countIn(from, to) {
        return all.filter(v => { const t = new Date(v[tsCol] || v.created_at); return t >= from && t < to; }).length;
    }
    document.getElementById('todayCount').textContent = countIn(todayStart, tomorrow);
    document.getElementById('weekCount').textContent  = countIn(weekStart, weekEnd);
    document.getElementById('monthCount').textContent = countIn(monthStart, monthEnd);
    document.getElementById('totalCount').textContent = all.length;
}

function getDateRange(filter) {
    const now = new Date();
    let from = null, to = null;
    if (filter === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to   = new Date(from.getTime() + 86400000);
    } else if (filter === 'week') {
        const day = now.getDay();
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1));
        to   = new Date(from.getTime() + 7 * 86400000);
    } else if (filter === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (filter === 'custom') {
        from = document.getElementById('dateFrom').value ? new Date(document.getElementById('dateFrom').value) : null;
        to   = document.getElementById('dateTo').value ? new Date(new Date(document.getElementById('dateTo').value).getTime() + 86400000) : null;
    }
    return { from, to };
}

document.getElementById('dateFilter').addEventListener('change', function () {
    const isCustom = this.value === 'custom';
    document.getElementById('customFrom').classList.toggle('hidden', !isCustom);
    document.getElementById('customTo').classList.toggle('hidden', !isCustom);
});

let currentData = [];
document.getElementById('applyBtn').addEventListener('click', applyFilters);
document.getElementById('resetBtn').addEventListener('click', resetFilters);

async function applyFilters() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="7">Fetching records…</td></tr>';
    document.getElementById('resultCount').textContent = 'Loading…';
    const dateFilter     = document.getElementById('dateFilter').value;
    const reasonFilter   = document.getElementById('reasonFilter').value;
    const collegeFilter  = document.getElementById('collegeFilter').value;
    const userTypeFilter = document.getElementById('userTypeFilter').value;
    const { from, to }   = dateFilter !== 'all' ? getDateRange(dateFilter) : {};
    const filters = {};
    if (from)           filters.from     = from;
    if (to)             filters.to       = to;
    if (reasonFilter)   filters.reason   = reasonFilter;
    if (collegeFilter)  filters.college  = collegeFilter;
    if (userTypeFilter) filters.userType = userTypeFilter;
    const data = await fetchVisits(filters);
    currentData = data;
    document.getElementById('resultCount').textContent = data.length + ' record' + (data.length !== 1 ? 's' : '');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No visitor records found</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(v => {
        const tsVal      = v[TS_COL] || v.created_at;
        const date       = tsVal ? new Date(tsVal).toLocaleString('en-PH') : '—';
        const college    = collegeNames[v.college] || v.college || '—';
        const badgeClass = 'badge-' + (v.user_type || '').toLowerCase();
        return `<tr>
            <td>${date}</td>
            <td>${v.full_name  || '—'}</td>
            <td>${v.email      || '—'}</td>
            <td><span class="badge ${badgeClass}">${v.user_type || '—'}</span></td>
            <td>${college}</td>
            <td>${v.course     || '—'}</td>
            <td>${v.reason     || '—'}</td>
        </tr>`;
    }).join('');
}

function resetFilters() {
    document.getElementById('dateFilter').value     = 'all';
    document.getElementById('reasonFilter').value   = '';
    document.getElementById('collegeFilter').value  = '';
    document.getElementById('userTypeFilter').value = '';
    document.getElementById('customFrom').classList.add('hidden');
    document.getElementById('customTo').classList.add('hidden');
    applyFilters();
}

document.getElementById('exportBtn').addEventListener('click', () => {
    if (!currentData.length) return;
    const headers = ['Date & Time', 'Full Name', 'Email', 'User Type', 'College', 'Course', 'Reason'];
    const rows = currentData.map(v => {
        const tsVal = v[TS_COL] || v.created_at;
        return [
            tsVal ? new Date(tsVal).toLocaleString('en-PH') : '—',
            v.full_name  || '',
            v.email      || '',
            v.user_type  || '',
            collegeNames[v.college] || v.college || '',
            v.course     || '',
            v.reason     || ''
        ];
    });
});
