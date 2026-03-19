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

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            window.location.href = 'homepage.html';
        }
    });
});

async function signInWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: 'https://Azalea731.github.io/NEU-Library/homepage.html'
        }
    });
    if (error) {
        document.getElementById('message').textContent = 'Google sign in failed: ' + error.message;
    }
}
