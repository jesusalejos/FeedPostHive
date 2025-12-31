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

// --- Función auxiliar para mensajes ---
function setStatus(msg, color = "black") {
    if(statusMsg) {
        statusMsg.innerHTML = msg;
        statusMsg.style.color = color;
    }
}

// --- Función que engaña al servidor (Paginación) ---
// Pide de 20 en 20 hasta juntar 80-100 posts
async function fetchBatchPosts(username) {
    let allPosts = [];
    let startPermlink = "";
    let beforeDate = "2025-12-31T23:59:59"; // Fecha futura para empezar desde hoy

    // Hacemos hasta 5 intentos (5 x 20 = 100 posts aprox)
    for (let i = 0; i < 5; i++) {
        // Pedimos solo 20 para respetar el límite del servidor
        const params = [username, startPermlink, beforeDate, 20];
        
        try {
            const batch = await client.call('condenser_api', 'get_discussions_by_author_before_date', params);

            if (!batch || batch.length === 0) break; // No hay más posts

            // Si no es la primera vuelta, borramos el primer post (porque se repite)
            if (allPosts.length > 0) {
                batch.shift();
            }
            
            if (batch.length === 0) break; 

            // Agregamos el lote al total
            allPosts = allPosts.concat(batch);

            // Preparamos los datos para la siguiente vuelta del bucle
            const lastPost = batch[batch.length - 1];
            startPermlink = lastPost.permlink;
            beforeDate = lastPost.created;

            // Si el lote vino incompleto (menos de 19), es que ya no hay más historial
            if (batch.length < 19) break;

        } catch (err) {
            console.warn("Error en un lote:", err);
            break; // Si falla un lote, paramos y mostramos lo que tenemos
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
    setStatus("⏳ Recolectando historial (esto toma unos segundos)...", "blue");
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    try {
        // Llamamos a nuestra función inteligente de lotes
        const result = await fetchBatchPosts(user);

        if (!result || result.length === 0) {
            setStatus("❌ Usuario no encontrado o sin posts.", "red");
            return;
        }

        // Filtro de mes
        let filteredPosts = result;
        if (selectedMonth) {
            filteredPosts = result.filter(post => post.created.startsWith(selectedMonth));
        }

        if (filteredPosts.length === 0) {
            setStatus("⚠️ No encontré posts de ese mes en los últimos 100 resultados.", "orange");
            return;
        }

        postsData = filteredPosts;
        setStatus(`✅ Se encontraron ${filteredPosts.length} publicaciones.`, "green");
        if(exportBtn) exportBtn.style.display = "inline-block";

        // Renderizado
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
        setStatus(`❌ Error inesperado: ${error.message}`, "red");
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
