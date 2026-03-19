import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jbtsirdrynfvwjsuzwlj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidHNpcmRyeW5mdndqc3V6d2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk1NjIsImV4cCI6MjA4OTMyNTU2Mn0.CxcXWnCr_zTdYVBLgyx9R83tE0aw352y4mTZTOO2-wY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

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

    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            document.querySelector('.nav-link.active')?.classList.remove('active');
            e.target.classList.add('active');
        });
    });
}

function handleDateFilterChange() {
    var value = elements.dateFilter.value;
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
        showError('Failed to load visitor records');
    }
}

function applyFilters() {
    filteredVisitors = allVisitors.filter(function(visitor) {
        var matchesDate = checkDateFilter(visitor.created_at);
        var matchesReason = !elements.reasonFilter.value || 
            visitor.reason === elements.reasonFilter.value;
        var matchesCollege = !elements.collegeFilter.value || 
            visitor.college === elements.collegeFilter.value;
        var matchesUserType = !elements.userTypeFilter.value || 
            visitor.user_type === elements.userTypeFilter.value;
        
        return matchesDate && matchesReason && matchesCollege && matchesUserType;
    });
    
    renderTable();
    updateResultCount();
}

function checkDateFilter(createdAt) {
    var filter = elements.dateFilter.value;
    var date = new Date(createdAt);
    
    if (filter === 'today') {
        return isToday(date);
    } else if (filter === 'week') {
        return isThisWeek(date);
    } else if (filter === 'month') {
        return isThisMonth(date);
    } else if (filter === 'custom') {
        var from = elements.dateFrom.value ? new Date(elements.dateFrom.value) : null;
        var to = elements.dateTo.value ? new Date(elements.dateTo.value) : null;
        return (!from || date >= from) && (!to || date <= to);
    } else {
        return true;
    }
}

function isToday(date) {
    var today = new Date();
    return date.toDateString() === today.toDateString();
}

function isThisWeek(date) {
    var today = new Date();
    var weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    return date >= weekStart;
}

function isThisMonth(date) {
    var today = new Date();
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
    
    var rows = '';
    for (var i = 0; i < filteredVisitors.length; i++) {
        var visitor = filteredVisitors[i];
        rows += '<tr>' +
            '<td>' + formatDateTime(visitor.created_at) + '</td>' +
            '<td>' + (visitor.full_name || 'N/A') + '</td>' +
            '<td>' + (visitor.email || 'N/A') + '</td>' +
            '<td><span class="badge badge-' + visitor.user_type + '">' + visitor.user_type + '</span></td>' +
            '<td>' + (visitor.college ? getCollegeName(visitor.college) : 'N/A') + '</td>' +
            '<td>' + (visitor.course || 'N/A') + '</td>' +
            '<td>' + (visitor.reason || 'N/A') + '</td>' +
        '</tr>';
    }
    elements.tableBody.innerHTML = rows;
}

function updateStats() {
    // FIX 3: pass the date object into the helper functions
    var today = 0;
    var week = 0;
    var month = 0;

    for (var i = 0; i < allVisitors.length; i++) {
        var date = new Date(allVisitors[i].created_at);
        if (isToday(date)) today++;
        if (isThisWeek(date)) week++;
        if (isThisMonth(date)) month++;
    }

    elements.todayCount.textContent = today;
    elements.weekCount.textContent = week;
    elements.monthCount.textContent = month;
    elements.totalCount.textContent = allVisitors.length.toLocaleString();
}

function updateResultCount() {
    // FIX 2: was missing backticks (template literal)
    elements.resultCount.textContent = ${filteredVisitors.length} results;
}

function updateLastUpdated() {
    var latest = allVisitors[0];
    if (latest) {
        // FIX 2: was missing backticks (template literal)
        elements.lastUpdated.textContent = Last updated: ${formatDateTime(latest.created_at)};
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
    var colleges = {
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
