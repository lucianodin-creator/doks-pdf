// ALERTA: Ajuste de DPI para evitar traço gigante (Dica 2)
function ajustarCanvasDPI(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Ajusta o tamanho interno (resolução)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Ajusta a escala do contexto para o traço bater com o dedo
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.abrirModalAssinatura = () => {
    const modal = document.getElementById('sig-modal');
    const canvas = document.getElementById('sig-pad');
    modal.style.display = 'flex';
    
    // O segredo: esperar o CSS renderizar antes de medir o DPI
    setTimeout(() => ajustarCanvasDPI(canvas), 200);
};
