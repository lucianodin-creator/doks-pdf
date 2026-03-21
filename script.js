// Variável global única para evitar conflitos
window.sigPad = null;

function openSigPad() {
    console.log("Tentando abrir o modal...");
    const modal = document.getElementById('sig-modal');
    const canvas = document.getElementById('sig-pad');
    
    if (!modal || !canvas) {
        console.error("Erro: Elementos do modal não encontrados!");
        return;
    }

    // Força a exibição antes de qualquer lógica
    modal.style.setProperty('display', 'flex', 'important');

    // Inicializa o SignaturePad se não existir
    if (!window.sigPad) {
        window.sigPad = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)'
        });
    }

    // Vacina de DPI e Redimensionamento
    setTimeout(() => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
        window.sigPad.clear(); 
    }, 300);
}

function closeSigPad() {
    document.getElementById('sig-modal').style.display = 'none';
}

// Vincula o clique via código para garantir que o HTML não falhe
document.addEventListener('DOMContentLoaded', () => {
    const btnAssinar = document.querySelector('button[onclick="openSigPad()"]');
    if (btnAssinar) {
        btnAssinar.removeAttribute('onclick');
        btnAssinar.addEventListener('click', openSigPad);
    }
});
