document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('email').value;
    const userType = document.getElementById('userType').value;
    const college = document.getElementById('college').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const message = document.getElementById('message');

    if (password !== confirmPassword) {
        message.textContent = 'Passwords do not match.';
        message.className = 'error';
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { fullname, userType, college }
        }
    });

    if (error) {
        message.textContent = 'Error: ' + error.message;
        message.className = 'error';
        return;
    }

    const user = data.user;
    if (user) {
        const { error: insertError } = await supabaseClient.from('profiles').insert({
            id: user.id,
            full_name: fullname,
            user_type: userType,
            college,
            email
        });

        if (insertError) {
            message.textContent = 'Account created but profile save failed: ' + insertError.message;
            message.className = 'error';
            return;
        }
    }

    message.textContent = 'Registration successful! Redirecting to login...';
    message.className = 'success';

    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
});