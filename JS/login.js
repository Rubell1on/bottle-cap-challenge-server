$('input[type="button"]').click(() => {
    const login = $('input[name="username"]').val();
    const password = $('input[name="password"]').val();

    $.get({
        url: `${window.location.origin}/api/login?username=${login}&password=${password}`,
        async: false,
        success: (data) => {
            location.href = `${window.location.origin}/dashboard?username=${data.username}&apiKey=${data.apiKey}`
        },
        error: (error) => console.error(error)
    })
});