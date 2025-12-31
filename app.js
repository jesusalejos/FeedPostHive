// Configuración de cliente con múltiples nodos
const client = new dhive.Client([
    "https://api.deathwing.me",    // Nodo rápido
    "https://api.hive.blog",       // Oficial
    "https://api.openhive.network" // Respaldo
]);

let postsData = []; 
let isSearching = false; // Para evitar doble clic

// Referencias del DOM
const counter = document.getElementById("counterCountsHIvers");
const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");
const monthFilter = document.getElementById("monthFilter");
const listPost = document.getElementById("postList");
const exportBtn = document.getElementById("exportExcel");
const statusMsg = document.getElementById("statusMessage");

// --- Función para mensajes ---
function setStatus(msg, color = "black") {
    if(statusMsg) {
        statusMsg.innerHTML = msg;
        statusMsg.style.color = color;
    }
}

// --- LÓGICA DE BÚSQUEDA PROFUNDA ---
async function getDeepHistory(username, targetYear, targetMonth) {
    let allPosts = [];
    let startPermlink = ""; 
    let beforeDate = "2025-12-31T23:59:59"; // Empezamos desde hoy hacia atrás
    
    // Convertimos el mes objetivo a string para comparar fácil (ej: "2023-05")
    const targetDateStr = targetYear && targetMonth ? `${targetYear}-${targetMonth}` : null;
    
    // SEGURIDAD: Máximo 2000 posts para no colgar el navegador si el usuario es un bot
    const MAX_POSTS_CHECK = 2000; 
    let totalChecked = 0;

    setStatus(`⏳ Analizando historial... (Posts revisados: 0)`, "blue");

    while (true) {
        // Pedimos lotes de 20 (Límite seguro de la API)
        const params = [username, startPermlink, beforeDate, 20];
        
        try {
            const batch = await client.call('condenser_api', 'get_discussions_by_author_before_date', params);

            if (!batch || batch.length === 0) break; // Fin del historial

            // Si no es el primer lote, quitamos el primero (repetido del lote anterior)
            if (totalChecked > 0) {
                batch.shift();
            }
            
            if (batch.length === 0) break;

            // Actualizamos contadores y referencias para el siguiente lote
            totalChecked += batch.length;
            const lastPost = batch[batch.length - 1];
            startPermlink = lastPost.permlink;
            beforeDate = lastPost.created;

            setStatus(`⏳ Escaneando... (Llevamos ${totalChecked} posts revisados)`, "blue");

            // --- LÓGICA DE FILTRADO EN TIEMPO REAL ---
            
            // 1. Extraemos la fecha del último post de este lote (ej: "2023-04")
            const lastPostMonth = lastPost.created.slice(0, 7);

            // 2. Si buscamos un mes específico...
            if (targetDateStr) {
                // Chequeamos si alguno de este lote nos sirve
                const matches = batch.filter(p => p.created.startsWith(targetDateStr));
                if (matches.length > 0) {
                    allPosts = allPosts.concat(matches);
                }

                // MOMENTO DE PARAR:
                // Si la fecha del último post es MENOR que la que buscamos, 
                // significa que ya pasamos el mes y estamos en el pasado.
                // Ej: Buscamos "2023-05" y vamos por "2023-04". ¡Frenamos!
                if (lastPostMonth < targetDateStr) {
                    break;
                }
            } else {
                // Si no hay filtro de mes, guardamos todo (modo normal)
                allPosts = allPosts.concat(batch);
                if (allPosts.length >= 100) break; // Sin filtro, solo traemos 100
            }

            // Seguridad anti-infinito
            if (totalChecked >= MAX_POSTS_CHECK) {
                alert("Se alcanzó el límite de seguridad (2000 posts scanneados). Intenta un mes más reciente.");
                break;
            }

            // Si el lote vino incompleto, es el fin del historial
            if (batch.length < 19) break;

        } catch (err) {
            console.warn("Error en lote:", err);
            setStatus("❌ Error de red momentáneo, intentando seguir...", "orange");
            // Esperamos 1 seg y reintentamos el mismo lote si quieres, o rompemos
            break; 
        }
    }
    return allPosts;
}

// --- Contador ---
async function updateAccountCount() {
    try {
        const result = await client.call('condenser_api', 'get_account_count', []);
        if(counter) counter.innerHTML = `<p style="color:#e31337; font-weight:bold;">Cuentas registradas: ${result}</p>`;
    } catch (error) {}
}

// --- Función Principal ---
async function fechBlog() {
    if (isSearching) return; // Evitar doble clic
    
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; // "2023-05"

    if (!user) { alert("Introduce un usuario"); return; }

    isSearching = true;
    listPost.innerHTML = "";
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    let searchYear = null;
    let searchMonth = null;
    if (selectedMonth) {
        [searchYear, searchMonth] = selectedMonth.split('-');
    }

    try {
        // Llamamos a la nueva función de búsqueda profunda
        const result = await getDeepHistory(user, searchYear, searchMonth);

        if (!result || result.length === 0) {
            setStatus("❌ No se encontraron posts en ese mes (o el usuario no existe).", "red");
            isSearching = false;
            return;
        }

        postsData = result;
        setStatus(`✅ ¡Éxito! Encontrados ${result.length} posts del mes ${selectedMonth || "reciente"}.`, "green");
        if(exportBtn) exportBtn.style.display = "inline-block";

        // Renderizar
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

// Eventos
if(activateButton) activateButton.addEventListener("click", fechBlog);
if(exportBtn) exportBtn.addEventListener("click", exportarCSV);
if(inputUser) inputUser.addEventListener("keydown", (e) => { if (e.key === "Enter") fechBlog(); });

updateAccountCount();
