const canvas = document.getElementById('sig-pad');
const ctx = canvas.getContext('2d');
let drawing = false;

// CORREÇÃO: Botão Limpar da Janela de Assinatura
document.getElementById('btn-clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Abrir Modal de Assinatura
document.getElementById('btn-pen').addEventListener('click', () => {
    document.getElementById('sig-modal').style.display = 'flex';
    resizeCanvas();
});

function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
}

// Fechar Modal
document.getElementById('btn-close').addEventListener('click', () => {
    document.getElementById('sig-modal').style.display = 'none';
});

// Lógica de Arrastar e Redimensionar a Assinatura no PDF
let activeBox = null;

function makeDraggable(el) {
    let offset = { x: 0, y: 0 };
    
    el.addEventListener('touchstart', (e) => {
        if(e.target.classList.contains('resizer')) return; // Deixa o redimensionador em paz
        const touch = e.touches[0];
        offset.x = touch.clientX - el.offsetLeft;
        offset.y = touch.clientY - el.offsetTop;
        activeBox = el;
    });

    document.addEventListener('touchmove', (e) => {
        if (activeBox === el) {
            const touch = e.touches[0];
            el.style.left = (touch.clientX - offset.x) + 'px';
            el.style.top = (touch.clientY - offset.y) + 'px';
        }
    });

    document.addEventListener('touchend', () => { activeBox = null; });
}

// Lógica de Redimensionar
function makeResizable(el) {
    const resizer = el.querySelector('.resizer');
    resizer.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        let startW = el.offsetWidth;
        let startH = el.offsetHeight;
        let startX = touch.clientX;
        let startY = touch.clientY;

        function doResize(re) {
            const rTouch = re.touches[0];
            el.style.width = (startW + (rTouch.clientX - startX)) + 'px';
            el.style.height = (startH + (rTouch.clientY - startY)) + 'px';
        }

        function stopResize() {
            document.removeEventListener('touchmove', doResize);
            document.removeEventListener('touchend', stopResize);
        }

        document.addEventListener('touchmove', doResize);
        document.addEventListener('touchend', stopResize);
    });
}
