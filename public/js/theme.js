let currentTheme = localStorage.getItem('theme') || 'light';

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const iconSun = $('.fa-sun');
    const iconMoon = $('.fa-moon');

    // Alternar a visibilidade dos ícones
    if (currentTheme === 'light') {
        iconSun.show();
        iconMoon.hide();
    } else {
        iconSun.hide();
        iconMoon.show();
    }
}

// Inicializar o tema ao carregar a página
$(document).ready(function() {
    $('#chk').prop('checked', currentTheme === 'dark');
    toggleTheme(); // Aplica o tema inicial

    // Adiciona o evento de clique ao slider
    $('#chk').on('change', toggleTheme);
});

// Exportar funções
window.themeModule = {
    currentTheme,
    toggleTheme
}; 