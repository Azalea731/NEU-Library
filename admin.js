const SUPABASE_URL = 'https://jbtsirdrynfvwjsuzwlj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidHNpcmRyeW5mdndqc3V6d2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk1NjIsImV4cCI6MjA4OTMyNTU2Mn0.CxcXWnCr_zTdYVBLgyx9R83tE0aw352y4mTZTOO2-wY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const collegeNames = {
    'gr-school': 'MBA', 's-law': 'M.Ed.', 'eteeap': 'ETEEAP', 'tesda': 'Alt. Learning System',
    'cir': "Int'l Relations", 'intr': 'Integrated School', 'ca': 'Accountancy', 
    'cas': 'Arts and Sciences', 'cag': 'Agriculture', 'cba': 'Business Administration',
    'ccom': 'Communication', 'ccrim': 'Criminology', 'ced': 'Education',
    'cea': 'Engineering & Architecture', 'cics': 'CICS', 'cm': 'Medicine',
    'cmt': 'Medical Technology', 'cmid': 'Midwifery', 'cmus': 'Music',
    'cn': 'Nursing', 'cpt': 'Physical Therapy', 'crt': 'Respiratory Therapy'
};

let TS_COL = null;
let currentData = [];

const elements = {
    sidebarEmail: document.getElementById('sidebarEmail'),
    lastUpdated: document.getElementById('lastUpdated'),
    todayCount: document.getElementById('todayCount'),
    weekCount: document.getElementById('weekCount'),
    monthCount: document.getElementById('monthCount'),
    totalCount: document.getElementById('totalCount'),
    tableBody: document.getElementById('tableBody'),
    resultCount: document.getElementById('resultCount'),
    dateFilter: document.getElementById('dateFilter'),
    customFrom: document.getElementById('customFrom'),
    customTo: document.getElementById('customTo'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    reasonFilter: document.getElementById('reasonFilter'),
    collegeFilter: document.getElementById('collegeFilter'),
    userTypeFilter: document.getElementById('userTypeFilter'),
    applyBtn: document.getElementById('applyBtn'),
    resetBtn: document.getElementById('resetBtn'),
    viewToggle: document.getElementById('viewToggle'),
    logoutBtn: document.getElementById('logoutBtn')
};

// Auth check
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (!session) return window.location.href = 'login.html';
    
    try {
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('user_type, email')
            .eq('id', session.user.id)
            .single();
        
        if (!profile || profile.user_type !== 'admin') {
            await supabaseClient.auth.signOut();
            return window.location.href = 'login.html';
        }
        
        showDashboard(profile.email);
    } catch (e) {
        console.error('Auth failed:', e);
        window.location.href = 'login.html';
    }
});

// Event listeners
elements.viewToggle.addEventListener('change', () => {
    if (elements.viewToggle.checked) window.location.href = 'homepage.html';
});
elements.logoutBtn.addEventListener('click', () => supabaseClient.auth.signOut().then(() => window.location.href = 'login.html'));
elements.dateFilter.addEventListener('change', handleDateFilterChange);
elements.applyBtn.addEventListener('click', applyFilters);
elements.resetBtn.addEventListener('click', resetFilters);

function handleDateFilterChange() {
    const isCustom = elements.dateFilter.value === 'custom';
    elements.customFrom.classList.toggle('hidden', !isCustom);
    elements.customTo.classList.toggle('hidden', !isCustom);
}

function showDashboard(email) {
    elements.sidebarEmail.textContent = email;
    elements.lastUpdated.textContent = `Last updated: ${new Date().toLocaleString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })}`;
    loadStats();
    applyFilters();
}

async function detectTimestampColumn() {
    if (TS_COL) return TS_COL;
    try {
        const { data } = await supabaseClient.from('visit_logs').select('*').limit(1).maybeSingle();
        if (!data) return TS_COL = 'created_at';
        
        const keys = Object.keys(data);
        const candidates = ['created_at', 'inserted_at', 'timestamp', 'visit_date', 'date'];
        for (const candidate of candidates) if (keys.includes(candidate)) return TS_COL = candidate;
        
        for (const key of keys) {
            if (data[key] && !isNaN(Date.parse(data[key]))) return TS_COL = key;
        }
    } catch (e) { console.warn('TS detect failed:', e); }
    return TS_COL = 'created_at';
}

async function fetchVisits(filters = {}) {
    try {
        const tsCol = await detectTimestampColumn();
        let query = supabaseClient.from('visit_logs').select('*').order(tsCol, { ascending: false });
        
        if (filters.from) query = query.gte(tsCol, filters.from.toISOString());
        if (filters.to) query = query.lt(tsCol, filters.to.toISOString());
        if (filters.reason) query = query.eq('reason', filters.reason);
        if (filters.college) query = query.eq('college', filters.college);
        if (filters.userType) query = query.eq('user_type', filters.userType);
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Fetch error:', error);
        showError(`Error: ${error.message}`);
        return [];
    }
}

async function loadStats() {
    const all = await fetchVisits();
    const tsCol = TS_COL || 'created_at';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart.getTime() + 86400000);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const countIn = (from, to) => all.filter(v => {
        const t = new Date(v[tsCol] || v.created_at);
        return t >= from && t < to;
    }).length;
    
    elements.todayCount.textContent = countIn(todayStart, tomorrow);
    elements.weekCount.textContent = countIn(weekStart, weekEnd);
    elements.monthCount.textContent = countIn(monthStart, monthEnd);
    elements.totalCount.textContent = all.length.toLocaleString();
}

function getDateRange(filter) {
    const now = new Date();
    let from, to;
    switch (filter) {
        case 'today':
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            to = new Date(from.getTime() + 86400000); break;
        case 'week':
            const day = now.getDay();
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1));
            to = new Date(from.getTime() + 7 * 86400000); break;
        case 'month':
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date(now.getFullYear(), now.getMonth() + 1, 1); break;
        case 'custom':
            const fromVal = elements.dateFrom.value;
            const toVal = elements.dateTo.value;
            from = fromVal ? new Date(fromVal) : null;
            to = toVal ? new Date(new Date(toVal).getTime() + 86400000) : null; break;
    }
    return { from, to };
}

async function applyFilters() {
    elements.tableBody.innerHTML = '<tr class="loading-row"><td colspan="7">Loading…</td></tr>';
    elements.resultCount.textContent = 'Loading…';
    
    const dateFilter = elements.dateFilter.value;
    const filters = {};
    
    if (dateFilter !== 'all') {
        const { from, to } = getDateRange(dateFilter);
        if (from) filters.from = from;
        if (to) filters.to = to;
    }
    if (elements.reasonFilter.value) filters.reason = elements.reasonFilter.value;
    if (elements.collegeFilter.value) filters.college = elements.collegeFilter.value;
    if (elements.userTypeFilter.value) filters.userType = elements.userTypeFilter.value;
    
    currentData = await fetchVisits(filters);
    elements.resultCount.textContent = `${currentData.length} record${currentData.length === 1 ? '' : 's'}`;
    renderTable();
}

function renderTable() {
    const tbody = elements.tableBody;
    if (currentData.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = currentData.map(v => {
        const tsVal = v[TS_COL] || v.created_at;
        const date = tsVal ? new Date(tsVal).toLocaleString('en-PH') : '—';
        const college = collegeNames[v.college] || v.college || '—';
        const badgeClass = `badge-${(v.user_type || '').toLowerCase()}`;
        return `
            <tr>
                <td>${date}</td>
                <td>${v.full_name || '—'}</td>
                <td>${v.email ||
