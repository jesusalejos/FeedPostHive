// Configuración de cliente con múltiples nodos
const client = new dhive.Client([
    "https://api.deathwing.me",
    "https://api.hive.blog",
    "https://api.openhive.network"
]);

let postsData = []; 

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

// --- LÓGICA DE PAGINACIÓN SEGURA ---
// Esta función pide datos de 20 en 20 para evitar el bloqueo del servidor
async function getSafeHistory(username) {
    let allPosts = [];
    let startPermlink = "";
    let beforeDate = "2025-12-31T23:59:59";
    const BATCH_LIMIT = 20; // Límite seguro que acepta cualquier nodo

    // Hacemos 5 rondas de 20 posts = 100 posts total
    for (let i = 0; i < 5; i++) {
        // Params: [usuario, permlink_inicio, fecha, limite]
        const params = [username, startPermlink, beforeDate, BATCH_LIMIT];
        
        try {
            // Llamada directa a la API
            const batch = await client.call('condenser_api', 'get_discussions_by_author_before_date', params);

            if (!batch || batch.length === 0) break;

            // Si no es la primera ronda, borramos el primero porque es el repetido de la ronda anterior
            if (allPosts.length > 0) {
                batch.shift();
            }

            if (batch.length === 0) break;

            // Agregamos los nuevos posts a nuestra lista maestra
            allPosts = allPosts.concat(batch);

            // Preparamos los datos para la siguiente ronda (paginación)
            const lastPost = batch[batch.length - 1];
            startPermlink = lastPost.permlink;
            beforeDate = lastPost.created;

            // Si el lote vino con menos de 20, es que se acabaron los posts
            if (batch.length < (BATCH_LIMIT - 1)) break;

        } catch (err) {
            console.warn("Error en un lote de paginación:", err);
            break; 
        }
    }
    return allPosts;
}

// --- Contador de Cuentas ---
async function updateAccountCount() {
    try {
        const result = await client.call('condenser_api', 'get_account_count', []);
        if(counter) counter.innerHTML = `<p style="color:#e31337; font-weight:bold;">Cuentas registradas: ${result}</p>`;
    } catch (error) { console.error(error); }
}

// --- Función Principal ---
async function fechBlog() {
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; 

    if (!user) { alert("Introduce un usuario"); return; }

    listPost.innerHTML = "";
    setStatus("⏳ Descargando historial por partes...", "blue");
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    try {
        // 1. Obtenemos los posts de forma segura (sin enviar limit=100)
        const result = await getSafeHistory(user);

        if (!result || result.length === 0) {
            setStatus("❌ Usuario no encontrado o sin posts.", "red");
            return;
        }

        // 2. Filtramos por mes en el navegador
        let filteredPosts = result;
        if (selectedMonth) {
            filteredPosts = result.filter(post => post.created.startsWith(selectedMonth));
        }

        if (filteredPosts.length === 0) {
            setStatus("⚠️ No encontré posts de ese mes (revisé los últimos 100).", "orange");
            return;
        }

        postsData = filteredPosts;
        setStatus(`✅ Se encontraron ${filteredPosts.length} publicaciones.`, "green");
        if(exportBtn) exportBtn.style.display = "inline-block";

        // 3. Renderizamos las tarjetas
        filteredPosts.forEach(post => {
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

// Iniciar
updateAccountCount();
