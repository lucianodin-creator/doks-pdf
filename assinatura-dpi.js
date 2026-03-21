// ALERTA: Conflito de DPI resolvido via DevicePixelRatio (Dica 3)
function ajustarDPI(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    console.log("DPI Ajustado: " + ratio);
}
