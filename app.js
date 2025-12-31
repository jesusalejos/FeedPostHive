// Configuración de cliente
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

function setStatus(msg, color = "black") {
    if(statusMsg) {
        statusMsg.innerHTML = msg;
        statusMsg.style.color = color;
    }
}

// --- LÓGICA DE PAGINACIÓN INTELIGENTE ---
// startDate: Fecha desde donde empezar a buscar hacia atrás
async function getSafeHistory(username, startYear, startMonth) {
    let allPosts = [];
    let startPermlink = "";
    
    // Por defecto buscamos desde "el futuro" para que traiga lo más reciente
    let beforeDate = "2025-12-31T23:59:59";

    // SI HAY FECHA: Calculamos el último día de ese mes para empezar a buscar desde ahí
    if (startYear && startMonth) {
        // Truco para obtener el último día del mes: día 0 del mes siguiente
        const lastDay = new Date(startYear, startMonth, 0).getDate(); 
        beforeDate = `${startYear}-${startMonth}-${lastDay}T23:59:59`;
        console.log("Viajando en el tiempo a:", beforeDate);
    }

    const BATCH_LIMIT = 20; 
    // Aumentamos a 10 rondas (200 posts) para asegurar que cubrimos todo el mes
    const MAX_ROUNDS = 10; 

    for (let i = 0; i < MAX_ROUNDS; i++) {
        const params = [username, startPermlink, beforeDate, BATCH_LIMIT];
        
        try {
            const batch = await client.call('condenser_api', 'get_discussions_by_author_before_date', params);

            if (!batch || batch.length === 0) break;

            if (allPosts.length > 0) batch.shift();
            if (batch.length === 0) break;

            allPosts = allPosts.concat(batch);

            const lastPost = batch[batch.length - 1];
            startPermlink = lastPost.permlink;
            beforeDate = lastPost.created;

            // Si seleccionamos un mes, y la fecha del post que acabamos de bajar 
            // ya es MENOR al mes que queremos, podemos parar de buscar (ya nos pasamos).
            if (startYear && startMonth) {
                const postDate = lastPost.created.split('-').slice(0, 2).join('-'); // "2023-05"
                const targetDate = `${startYear}-${startMonth}`;
                // Comparación simple de texto: si "2023-04" < "2023-05", paramos
                if (postDate < targetDate) break;
            }

            if (batch.length < (BATCH_LIMIT - 1)) break;

        } catch (err) {
            console.warn("Error en lote:", err);
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
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; // "2024-05"

    if (!user) { alert("Introduce un usuario"); return; }

    listPost.innerHTML = "";
    setStatus("⏳ Buscando posts exactos...", "blue");
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    // Desglosamos la fecha si existe
    let searchYear = null;
    let searchMonth = null;
    if (selectedMonth) {
        [searchYear, searchMonth] = selectedMonth.split('-');
    }

    try {
        // Enviamos la fecha a la función de búsqueda
        const result = await getSafeHistory(user, searchYear, searchMonth);

        if (!result || result.length === 0) {
            setStatus("❌ No se encontraron posts (Revisa el nombre).", "red");
            return;
        }

        // Filtramos estrictamente lo que bajamos
        let filteredPosts = result;
        if (selectedMonth) {
            filteredPosts = result.filter(post => post.created.startsWith(selectedMonth));
        }

        if (filteredPosts.length === 0) {
            setStatus("⚠️ Usuario encontrado, pero no tiene posts en ese mes exacto.", "orange");
            return;
        }

        postsData = filteredPosts;
        setStatus(`✅ Encontrados ${filteredPosts.length} posts de ${selectedMonth || "la historia reciente"}.`, "green");
        if(exportBtn) exportBtn.style.display = "inline-block";

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

updateAccountCount();
