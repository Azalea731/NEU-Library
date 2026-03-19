document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('message');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        message.textContent = 'Login failed: ' + error.message;
        return;
    }

    const user = data.user;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

    if (profile && profile.user_type === 'admin') {
        window.location.href = 'choice.html';
    } else {
        window.location.href = 'homepage.html';
    }
});
