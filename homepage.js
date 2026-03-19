const collegeNames = {
    'gr-school': 'Master of Business Administration (MBA)',
    's-law': 'Master of Education (M.Ed.)',
    'eteeap': 'ETEEAP',
    'tesda': 'Alternative Learning System',
    'cir': 'College of International Relations',
    'intr': 'Integrated School',
    'ca': 'College of Accountancy',
    'cas': 'College of Arts and Sciences',
    'cag': 'College of Agriculture',
    'cba': 'College of Business Administration',
    'ccom': 'College of Communication',
    'ccrim': 'College of Criminology',
    'ced': 'College of Education',
    'cea': 'College of Engineering and Architecture',
    'cics': 'College of Informatics and Computing Studies (CICS)',
    'cm': 'College of Medicine',
    'cmt': 'College of Medical Technology',
    'cmid': 'College of Midwifery',
    'cmus': 'College of Music',
    'cn': 'College of Nursing',
    'cpt': 'College of Physical Therapy',
    'crt': 'College of Respiratory Therapy',
};

const coursesByCollege = {
    'cics':  ['BSIT', 'BSCS', 'BSIS', 'ACT'],
    'cea':   ['BSCE', 'BSCpE', 'BSEE', 'BSArch', 'BSME'],
    'cba':   ['BSBA', 'BSEntrep', 'BSOA'],
    'ca':    ['BSA', 'BSMA'],
    'cn':    ['BSN'],
    'ced':   ['BEED', 'BSED'],
    'ccom':  ['AB Communication', 'AB Journalism'],
    'ccrim': ['BS Criminology'],
    'cm':    ['MD'],
    'cmt':   ['BS Medical Technology'],
    'cmid':  ['BS Midwifery'],
    'cmus':  ['BS Music'],
    'cpt':   ['BS Physical Therapy'],
    'crt':   ['BS Respiratory Therapy'],
    'cas':   ['AB Psychology', 'AB Political Science', 'BS Biology', 'BS Math'],
    'cag':   ['BS Agriculture'],
    'cir':   ['AB International Relations'],
};

let userProfile = null;

document.addEventListener('DOMContentLoaded', async () => {

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    await loadProfile(session.user.id);
});

async function loadProfile(userId) {
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name, email, user_type, college')
        .eq('id', userId)
        .single();

    if (!profile) {
        window.location.href = 'login.html';
        return;
    }

    userProfile = profile;

    document.getElementById('greetName').textContent = 'Hello, ' + profile.full_name;

    const collegeName = collegeNames[profile.college] || profile.college || '—';
    document.getElementById('collegeDisplay').textContent = collegeName;

    const courseSelect = document.getElementById('courseSelect');
    const courses = coursesByCollege[profile.college] || [];

    if (courses.length > 0) {
        courses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            courseSelect.appendChild(opt);
        });
    } else {
        const opt = document.createElement('option');
        opt.value = 'N/A';
        opt.textContent = 'N/A';
        courseSelect.appendChild(opt);
        courseSelect.value = 'N/A';
    }
}

function toggleOthers() {
    const purpose = document.getElementById('purposeSelect').value;
    document.getElementById('othersField').classList.toggle('hidden', purpose !== 'Others');
}

async function submitCheckin() {
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('submitBtn');
    const course  = document.getElementById('courseSelect').value;
    const purpose = document.getElementById('purposeSelect').value;

    errorMsg.textContent = '';

    if (!course)  { errorMsg.textContent = 'Please select a course.'; return; }
    if (!purpose) { errorMsg.textContent = 'Please select a purpose.'; return; }

    let finalPurpose = purpose;
    if (purpose === 'Others') {
        const othersText = document.getElementById('othersText').value.trim();
        if (!othersText) { errorMsg.textContent = 'Please specify your reason.'; return; }
        finalPurpose = othersText;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const { data: { session } } = await supabaseClient.auth.getSession();

    const { error: insertError } = await supabaseClient.from('visit_logs').insert({
        user_id:   session.user.id,
        full_name: userProfile.full_name,
        email:     userProfile.email,
        user_type: userProfile.user_type,
        college:   userProfile.college,
        course:    course,
        reason:    finalPurpose
    });

    if (insertError) {
        errorMsg.textContent = 'Check-in failed: ' + insertError.message;
        btn.disabled = false;
        btn.textContent = 'Submit Visit';
        return;
    }

    const collegeName = collegeNames[userProfile.college] || userProfile.college || '—';
    const now = new Date().toLocaleString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    document.getElementById('successName').textContent    = userProfile.full_name;
    document.getElementById('successCollege').textContent = collegeName;
    document.getElementById('successCourse').textContent  = course;
    document.getElementById('successPurpose').textContent = finalPurpose;
    document.getElementById('successDate').textContent    = now;
    document.getElementById('checkinView').classList.add('hidden');
    document.getElementById('successView').classList.remove('hidden');
}

function checkInAgain() {
    document.getElementById('courseSelect').selectedIndex  = 0;
    document.getElementById('purposeSelect').selectedIndex = 0;
    document.getElementById('othersText').value = '';
    document.getElementById('othersField').classList.add('hidden');
    document.getElementById('errorMsg').textContent = '';
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').textContent = 'Submit Visit';
    document.getElementById('successView').classList.add('hidden');
    document.getElementById('checkinView').classList.remove('hidden');
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
