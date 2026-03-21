// Função global para evitar conflitos de escopo
window.abrirModalAssinatura = function() {
    console.log("Botão Assinar clicado!");
    const modal = document.getElementById('sig-modal');
    const canvas = document.getElementById('sig-pad');

    if (!modal || !canvas) {
        alert("Erro: Elementos do modal não encontrados no HTML!");
        return;
    }

    // Força a exibição
    modal.style.setProperty('display', 'flex', 'important');

    // Inicializa o SignaturePad se necessário
    if (!window.signaturePad) {
        window.signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)'
        });
    }

    // Ajuste de DPI (Dica 2 da estratégia de build)
    setTimeout(() => {
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
        window.signaturePad.clear();
    }, 300);
};

window.fecharModal = function() {
    document.getElementById('sig-modal').style.display = 'none';
};
