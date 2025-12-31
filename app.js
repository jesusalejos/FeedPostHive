// Configuración de cliente con múltiples nodos
const client = new dhive.Client([
    "https://api.deathwing.me",
    "https://api.hive.blog",
    "https://api.openhive.network"
]);

let postsData = []; 
let isSearching = false;

// Elementos DOM
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

// --- BÚSQUEDA QUIRÚRGICA ---
async function getTargetedHistory(username, targetYear, targetMonth) {
    let allPosts = [];
    let startPermlink = "";
    let beforeDate = "2025-12-31T23:59:59"; // Por defecto hoy
    
    // Si hay fecha seleccionada, calculamos el "Salto Temporal"
    let targetDatePrefix = null;

    if (targetYear && targetMonth) {
        // Javascript cuenta los meses desde 0 (Enero=0), pero el input da "01".
        // new Date(anio, mes, 0) nos da el último día del mes.
        const lastDayOfMonth = new Date(parseInt(targetYear), parseInt(targetMonth), 0).getDate();
        
        // Configuramos la fecha de corte al FINAL de ese mes
        beforeDate = `${targetYear}-${targetMonth}-${lastDayOfMonth}T23:59:59`;
        targetDatePrefix = `${targetYear}-${targetMonth}`;
        
        console.log(`Teletransportando búsqueda a: ${beforeDate}`);
    }

    // Buscamos en bucle hasta completar el mes o llegar a 100 posts
    // Máximo 10 rondas para no buclear infinito si hay error
    for (let i = 0; i < 10; i++) {
        
        // Pedimos lotes de 20 (seguro para la API)
        const params = [username, startPermlink, beforeDate, 20];
        
        try {
            const batch = await client.call('condenser_api', 'get_discussions_by_author_before_date', params);

            if (!batch || batch.length === 0) break;

            // Eliminamos el primer elemento si no es la primera ronda (es duplicado)
            if (allPosts.length > 0) batch.shift();
            
            if (batch.length === 0) break;

            // --- FILTRADO INTELIGENTE ---
            // Si estamos buscando un mes específico:
            if (targetDatePrefix) {
                // Filtramos solo los que coinciden con el mes
                const matchingPosts = batch.filter(p => p.created.startsWith(targetDatePrefix));
                allPosts = allPosts.concat(matchingPosts);

                // Verificamos el último post del lote
                const lastPost = batch[batch.length - 1];
                const lastPostMonth = lastPost.created.substring(0, 7); // "2023-05"

                // Si la fecha del último post bajado es MENOR al mes objetivo, 
                // significa que ya nos pasamos hacia el pasado. ¡Terminamos!
                if (lastPostMonth < targetDatePrefix) {
                    break;
                }
            } else {
                // Si no hay filtro de fecha, guardamos todo hasta 100
                allPosts = allPosts.concat(batch);
                if (allPosts.length >= 100) break;
            }

            // Preparamos siguiente ronda
            const lastOne = batch[batch.length - 1];
            startPermlink = lastOne.permlink;
            beforeDate = lastOne.created;

            // Si el lote está incompleto, no hay más historial
            if (batch.length < 19) break;

        } catch (err) {
            console.warn("Error en lote:", err);
            break; 
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

    // Parseamos la fecha
    let sYear = null, sMonth = null;
    if (selectedMonth) {
        [sYear, sMonth] = selectedMonth.split('-');
    }

    setStatus(selectedMonth ? `⏳ Saltando a ${selectedMonth} y buscando posts...` : "⏳ Buscando posts recientes...", "blue");

    try {
        const result = await getTargetedHistory(user, sYear, sMonth);

        if (!result || result.length === 0) {
            setStatus("❌ No hay posts en ese mes exacto.", "red");
            isSearching = false;
            return;
        }

        postsData = result;
        setStatus(`✅ ¡Encontrados ${result.length} posts!`, "green");
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

// Contador simple al inicio
(async () => {
   try {
       const res = await client.call('condenser_api', 'get_account_count', []);
       counter.innerHTML = `<p style="color:#e31337; font-weight:bold;">Cuentas: ${res}</p>`;
   } catch(e) {} 
})();
