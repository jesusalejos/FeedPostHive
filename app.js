// Configuración de cliente
const client = new dhive.Client([
    "https://api.deathwing.me",
    "https://api.hive.blog",
    "https://api.openhive.network"
]);

let postsData = []; 
let isSearching = false;

// DOM
const counter = document.getElementById("counterCountsHIvers");
const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");
const monthFilter = document.getElementById("monthFilter");
const listPost = document.getElementById("postList");
const exportBtn = document.getElementById("exportExcel");
const statusMsg = document.getElementById("statusMessage");

function setStatus(msg, color = "black") {
    if(statusMsg) {
        statusMsg.innerHTML = msg;
        statusMsg.style.color = color;
    }
}

// --- FUNCIÓN DE ESCANEO CONTINUO ---
async function crawlHistory(username, targetYear, targetMonth) {
    let allPosts = [];
    let startPermlink = "";
    let beforeDate = "2025-12-31T23:59:59"; // Empezamos desde el futuro
    
    // Convertimos el mes objetivo a texto para comparar (Ej: "2023-05")
    const targetDateStr = targetYear && targetMonth ? `${targetYear}-${targetMonth}` : null;
    
    let postsChecked = 0;
    const SAFETY_LIMIT = 5000; // Tope para no colgar el navegador (equivale a años de posts diarios)

    // Bucle infinito hasta encontrar el mes
    while (true) {
        // Pedimos 20 posts (límite seguro)
        const params = [username, startPermlink, beforeDate, 20];

        try {
            const batch = await client.call('condenser_api', 'get_discussions_by_author_before_date', params);

            // Si no devuelve nada, se acabó el historial del usuario
            if (!batch || batch.length === 0) break;

            // Eliminamos el primer elemento (duplicado de la paginación anterior)
            if (postsChecked > 0) batch.shift();
            
            if (batch.length === 0) break;

            // Datos para la siguiente vuelta
            const lastPost = batch[batch.length - 1];
            startPermlink = lastPost.permlink;
            beforeDate = lastPost.created;
            postsChecked += batch.length;

            // Fecha actual del escaneo (para mostrar al usuario y filtrar)
            const currentScanDate = lastPost.created.slice(0, 7); // "2024-08"

            // Actualizamos estado en pantalla
            if (targetDateStr) {
                setStatus(`⏳ Escaneando historial... Voy por: ${currentScanDate} (Revisados: ${postsChecked})`, "blue");
            } else {
                setStatus(`⏳ Bajando últimos posts... (Revisados: ${postsChecked})`, "blue");
            }

            // --- LÓGICA DE DETECCIÓN ---
            
            if (targetDateStr) {
                // 1. Buscamos coincidencias en este lote
                const matches = batch.filter(p => p.created.startsWith(targetDateStr));
                allPosts = allPosts.concat(matches);

                // 2. ¿Ya nos pasamos?
                // Si la fecha que estamos escaneando (ej: 2023-04) es MENOR que la buscada (ej: 2023-05)
                // significa que ya revisamos todo el mes de Mayo y estamos en Abril. PARAR.
                if (currentScanDate < targetDateStr) {
                    break;
                }
            } else {
                // Si no hay filtro, solo guardamos los primeros 100
                allPosts = allPosts.concat(batch);
                if (allPosts.length >= 100) break;
            }

            // Seguridad
            if (postsChecked >= SAFETY_LIMIT) {
                alert("Se alcanzó el límite de seguridad (5000 posts). El usuario publica demasiado.");
                break;
            }

            // Si el lote vino incompleto (< 19), es el fin real
            if (batch.length < 19) break;

        } catch (err) {
            console.warn("Error de red en lote:", err);
            // Intentamos seguir en la siguiente vuelta
            await new Promise(r => setTimeout(r, 1000)); // Esperar 1 seg
        }
    }
    return allPosts;
}

// --- Función Principal ---
async function fechBlog() {
    if (isSearching) return;
    
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; // "2024-05"

    if (!user) { alert("Introduce un usuario"); return; }

    isSearching = true;
    listPost.innerHTML = "";
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    let sYear = null, sMonth = null;
    if (selectedMonth) {
        [sYear, sMonth] = selectedMonth.split('-');
    }

    try {
        const result = await crawlHistory(user, sYear, sMonth);

        if (!result || result.length === 0) {
            setStatus("❌ No se encontraron posts en ese periodo.", "red");
            isSearching = false;
            return;
        }

        postsData = result;
        setStatus(`✅ ¡Encontrados ${result.length} posts del mes ${selectedMonth || "actual"}!`, "green");
        if(exportBtn) exportBtn.style.display = "inline-block";

        // Renderizado
        result.forEach(post => {
            let image = 'https://images.hive.blog/DQmPZ979S6NfX8H7H7H7H7H7H7H7H7H7/noimage.png';
            try {
                const json = JSON.parse(post.json_metadata);
                if (json.image && json.image.length > 0) image = json.image[0];
            } catch (e) {}

            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML = `
                <h2>${post.title}</h2>
                <p>by <strong>${post.author}</strong></p>
                <div style="display:flex; justify-content:center; margin: 10px 0;">
                    <img src="${image}" style="max-width: 100%; max-height: 300px; border-radius: 10px; object-fit: cover;">
                </div>
                <p>📅 ${new Date(post.created).toLocaleDateString()}</p>
                <button class="view-btn" onclick="window.open('https://peakd.com${post.url}', '_blank')">Ver post...</button>
            `;
            listPost.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        setStatus(`❌ Error: ${error.message}`, "red");
    }
    isSearching = false;
}

// --- Exportar CSV ---
function exportarCSV() {
    if (postsData.length === 0) return;
    let csv = "\uFEFFTítulo,Fecha,Enlace\n";
    postsData.forEach(p => {
        const cleanTitle = p.title.replace(/"/g, '""'); 
        const link = `https://peakd.com${p.url}`;
        csv += `"${cleanTitle}",${p.created.split('T')[0]},${link}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `posts_${inputUser.value}.csv`;
    link.click();
}

// Inicialización
if(activateButton) activateButton.addEventListener("click", fechBlog);
if(exportBtn) exportBtn.addEventListener("click", exportarCSV);
if(inputUser) inputUser.addEventListener("keydown", (e) => { if (e.key === "Enter") fechBlog(); });

// Contador
(async () => {
   try {
       const res = await client.call('condenser_api', 'get_account_count', []);
       counter.innerHTML = `<p style="color:#e31337; font-weight:bold;">Cuentas: ${res}</p>`;
   } catch(e) {} 
})();
