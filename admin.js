<script>
// NO import needed - use global supabase from CDN
const SUPABASE_URL = 'https://jbtsirdrynfvwjsuzwlj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidHNpcmRyeW5mdndqc3V6d2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk1NjIsImV4cCI6MjA4OTMyNTU2Mn0.CxcXWnCr_zTdYVBLgyx9R83tE0aw352y4mTZTOO2-wY';

let currentUser = null;
let allVisitors = [];
let filteredVisitors = [];
let currentView = 'admin'; 

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
    logoutBtn: document.getElementById('logoutBtn'),
    dashboardPage: document.getElementById('dashboardPage')
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    await checkAuth();
    setupEventListeners();
    loadVisitors();
}

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = session.user;
    elements.sidebarEmail.textContent = currentUser.email || 'Admin User';

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'login.html';
        }
    });
}

function setupEventListeners() {
    elements.dateFilter.addEventListener('change', handleDateFilterChange);
    elements.applyBtn.addEventListener('click', applyFilters);
    elements.resetBtn.addEventListener('click', resetFilters);
    
    elements.viewToggle.addEventListener('change', toggleView);
    elements.logoutBtn.addEventListener('click', logout);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            document.querySelector('.nav-link.active')?.classList.remove('active');
            e.target.classList.add('active');
        });
    });
}

function handleDateFilterChange() {
    const value = elements.dateFilter.value;
    elements.customFrom.classList.toggle('hidden', value !== 'custom');
    elements.customTo.classList.toggle('hidden', value !== 'custom');
    
    if (value === 'custom') {
        elements.dateFrom.valueAsDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        elements.dateTo.valueAsDate = new Date();
    }
}

async function loadVisitors() {
    try {
        elements.tableBody.innerHTML = '<tr class="loading-row"><td colspan="7">Loading records…</td></tr>';
        
        const { data, error } = await supabase
            .from('visitors')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allVisitors = data || [];
        filteredVisitors = [...allVisitors];
        applyFilters();
        updateStats();
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error loading visitors:', error);
        showError('Failed to load visitor records: ' + error.message);
    }
}

function applyFilters() {
    filteredVisitors = allVisitors.filter(visitor => {
        const matchesDate = checkDateFilter(visitor.created_at);
        const matchesReason = !elements.reasonFilter.value || visitor.reason === elements.reasonFilter.value;
        const matchesCollege = !elements.collegeFilter.value || visitor.college === elements.collegeFilter.value;
        const matchesUserType = !elements.userTypeFilter.value || visitor.user_type === elements.userTypeFilter.value;
        
        return matchesDate && matchesReason && matchesCollege && matchesUserType;
    });
    
    renderTable();
    updateResultCount();
}

function checkDateFilter(createdAt) {
    const filter = elements.dateFilter.value;
    const date = new Date(createdAt);
    
    switch (filter) {
        case 'today': return isToday(date);
        case 'week': return isThisWeek(date);
        case 'month': return isThisMonth(date);
        case 'custom': {
            const from = elements.dateFrom.value ? new Date(elements.dateFrom.value) : null;
            const to = elements.dateTo.value ? new Date(elements.dateTo.value) : null;
            return (!from || date >= from) && (!to || date <= to);
        }
        default: return true;
    }
}

function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isThisWeek(date) {
    const today = new Date();
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    return date >= weekStart;
}

function isThisMonth(date) {
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function renderTable() {
    if (filteredVisitors.length === 0) {
        elements.tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No visitors found matching your filters</td>
            </tr>
        `;
        return;
    }
    
    elements.tableBody.innerHTML = filteredVisitors.map(visitor => `
        <tr>
            <td>${formatDateTime(visitor.created_at)}</td>
            <td>${visitor.full_name || 'N/A'}</td>
            <td>${visitor.email || 'N/A'}</td>
            <td><span class="badge badge-${visitor.user_type}">${visitor.user_type}</span></td>
            <td>${visitor.college ? getCollegeName(visitor.college) : 'N/A'}</td>
            <td>${visitor.course || 'N/A'}</td>
            <td>${visitor.reason || 'N/A'}</td>
        </tr>
    `).join('');
}

function updateStats() {
    const todayCount = allVisitors.filter(v => isToday(new Date(v.created_at))).length;
    const weekCount = allVisitors.filter(v => isThisWeek(new Date(v.created_at))).length;
    const monthCount = allVisitors.filter(v => isThisMonth(new Date(v.created_at))).length;
    
    elements.todayCount.textContent = todayCount;
    elements.weekCount.textContent = weekCount;
    elements.monthCount.textContent = monthCount;
    elements.totalCount.textContent = allVisitors.length.toLocaleString();
}

function updateResultCount() {
    elements.resultCount.textContent = `${filteredVisitors.length} results`;
}

function updateLastUpdated() {
    const latest = allVisitors[0];
    if (latest) {
        elements.lastUpdated.textContent = `Last updated: ${formatDateTime(latest.created_at)}`;
    }
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCollegeName(code) {
    const colleges = {
        'gr-school': 'MBA',
        's-law': 'M.Ed.',
        'eteeap': 'ETEEAP',
        'tesda': 'Alt. Learning System',
        'cir': 'Int\'l Relations',
        'intr': 'Integrated School',
        'ca': 'Accountancy',
        'cas': 'Arts and Sciences',
        'cag': 'Agriculture',
        'cba': 'Business Administration',
        'ccom': 'Communication',
        'ccrim': 'Criminology',
        'ced': 'Education',
        'cea': 'Engineering & Architecture',
        'cics': 'Informatics & Computing (CICS)',
        'cm': 'Medicine',
        'cmt': 'Medical Technology',
        'cmid': 'Midwifery',
        'cmus': 'Music',
        'cn': 'Nursing',
        'cpt': 'Physical Therapy',
        'crt': 'Respiratory Therapy'
    };
    return colleges[code] || code;
}

function resetFilters() {
    elements.dateFilter.value = 'all';
    elements.reasonFilter.value = '';
    elements.collegeFilter.value = '';
    elements.userTypeFilter.value = '';
    handleDateFilterChange();
    applyFilters();
}

function toggleView() {
    currentView = elements.viewToggle.checked ? 'user' : 'admin';
    console.log('Switched to', currentView, 'view');
}

async function logout() {
    await supabase.auth.signOut();
}

function showError(message) {
    elements.tableBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="7" style="color: #ef4444;">${message}</td>
        </tr>
    `;
}
</script>
