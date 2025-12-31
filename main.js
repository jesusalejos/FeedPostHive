// Configuración de cliente con múltiples nodos
const client = new dhive.Client([
    "https://api.deathwing.me",    // Nodo prioritario
    "https://api.hive.blog",       // Nodo oficial
    "https://api.openhive.network" // Respaldo
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

// --- Función para mostrar mensajes de estado ---
function setStatus(msg, color = "black") {
    if(statusMsg) {
        statusMsg.innerHTML = msg;
        statusMsg.style.color = color;
    }
}

// --- Contador de Cuentas ---
async function updateAccountCount() {
    try {
        const result = await client.call('condenser_api', 'get_account_count', []);
        if(counter) counter.innerHTML = `<p style="color:#e31337; font-weight:bold;">Cuentas registradas: ${result}</p>`;
    } catch (error) {
        console.error("Error contador:", error);
    }
}

// --- Función Principal ---
async function fechBlog() {
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; // Formato YYYY-MM

    if (!user) {
        alert("Introduce un usuario");
        return;
    }

    listPost.innerHTML = "";
    setStatus("⏳ Buscando historial en la blockchain...", "blue");
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    // CAMBIO IMPORTANTE:
    // Usamos 'get_discussions_by_author_before_date'
    // Parámetros: [autor, start_permlink, fecha_tope, limite]
    // start_permlink vacío "" significa "empezar desde el último post"
    // fecha_tope futura asegura que traiga los más recientes
    const params = [
        user, 
        "", 
        "2025-12-31T23:59:59", 
        100 
    ];

    try {
        // Llamada al método que SÍ permite 100 items
        const result = await client.call('condenser_api', 'get_discussions_by_author_before_date', params);

        if (!result || result.length === 0) {
            setStatus("❌ Usuario no encontrado o sin posts.", "red");
            return;
        }

        // Filtramos por mes
        let filteredPosts = result;
        if (selectedMonth) {
            filteredPosts = result.filter(post => post.created.startsWith(selectedMonth));
        }

        if (filteredPosts.length === 0) {
            setStatus("⚠️ No hay posts en ese mes específico (dentro de los últimos 100).", "orange");
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
                if (json.image && json.image.length > 0) {
                    image = json.image[0];
                }
            } catch (e) {}

            const urlPlus = `https://peakd.com${post.url}`;
            const created = new Date(post.created).toLocaleDateString();

            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML = `
                <h2>${post.title}</h2>
                <p>by <strong>${post.author}</strong></p>
                <div style="display:flex; justify-content:center; margin: 10px 0;">
                    <img src="${image}" style="max-width: 100%; max-height: 300px; border-radius: 10px; object-fit: cover;">
                </div>
                <p>📅 ${created}</p>
                <button class="view-btn" onclick="window.open('${urlPlus}', '_blank')">Ver post...</button>
            `;
            
            listPost.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        setStatus(`❌ Error: ${error.message || error}`, "red");
    }
}

// --- Exportar a CSV ---
function exportarCSV() {
    if (postsData.length === 0) return;
    let csv = "\uFEFFTítulo,Fecha,Enlace\n";
    
    postsData.forEach(p => {
        const cleanTitle = p.title.replace(/"/g, '""'); 
        const date = p.created.split('T')[0];
        const link = `https://peakd.com${p.url}`;
        csv += `"${cleanTitle}",${date},${link}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `posts_${inputUser.value}.csv`);
    link.click();
}

// Listeners
if(activateButton) activateButton.addEventListener("click", fechBlog);
if(exportBtn) exportBtn.addEventListener("click", exportarCSV);

if(inputUser) {
    inputUser.addEventListener("keydown", (e) => {
        if (e.key === "Enter") fechBlog();
    });
}

// Iniciar
updateAccountCount();
