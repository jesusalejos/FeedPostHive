// Configuración de cliente con múltiples nodos para evitar caídas
const client = new dhive.Client([
    "https://api.deathwing.me",       // Nodo muy rápido y permisivo
    "https://api.hive.blog",          // Nodo oficial
    "https://api.openhive.network"    // Respaldo
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

// --- Función para actualizar mensaje de estado ---
function setStatus(msg, color = "black") {
    statusMsg.innerHTML = msg;
    statusMsg.style.color = color;
}

// --- Contador de Cuentas ---
// Se ejecuta al cargar para verificar conexión
async function updateAccountCount() {
    try {
        // Llamada directa a la blockchain
        const result = await client.call('condenser_api', 'get_account_count', []);
        counter.innerHTML = `<p style="color:#e31337; font-weight:bold;">Cuentas registradas: ${result}</p>`;
    } catch (error) {
        console.error("Error contador:", error);
        counter.innerHTML = "Estado: Desconectado (Revisa tu internet)";
    }
}

// --- Función Principal ---
async function fechBlog() {
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; // YYYY-MM

    if (!user) {
        alert("Introduce un usuario");
        return;
    }

    listPost.innerHTML = "";
    setStatus("⏳ Buscando en la blockchain...", "blue");
    exportBtn.style.display = "none";
    postsData = [];

    // Límite alto para poder filtrar por fechas antiguas
    const query = {
        tag: user,
        limit: 100 
    };

    try {
        // Usamos la librería dhive moderna
        const result = await client.database.getDiscussions('blog', query);

        if (!result || result.length === 0) {
            setStatus("❌ Usuario no encontrado o sin posts.", "red");
            return;
        }

        // Filtrado por mes en Javascript
        let filteredPosts = result;
        if (selectedMonth) {
            filteredPosts = result.filter(post => post.created.startsWith(selectedMonth));
        }

        if (filteredPosts.length === 0) {
            setStatus("⚠️ No hay posts en ese mes (Intenta buscar sin fecha primero).", "orange");
            return;
        }

        postsData = filteredPosts;
        setStatus(`✅ Se encontraron ${filteredPosts.length} publicaciones.`, "green");
        exportBtn.style.display = "inline-block";

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

            // Crear HTML del post
            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML = `
                <h2>${post.title}</h2>
                <p>by <strong>${post.author}</strong></p>
                <div style="display:flex; justify-content:center; margin: 10px 0;">
                    <img src="${image}" style="max-width: 100%; max-height: 300px; border-radius: 10px;">
                </div>
                <p>📅 ${created}</p>
                <button class="view-btn" onclick="window.open('${urlPlus}', '_blank')">Ver post...</button>
            `;
            
            listPost.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        setStatus("❌ Error de API. Abre la consola (F12) para ver detalles.", "red");
    }
}

// --- Exportar a CSV ---
function exportarCSV() {
    if (postsData.length === 0) return;
    let csv = "\uFEFFTítulo,Fecha,Enlace\n";
    
    postsData.forEach(p => {
        const cleanTitle = p.title.replace(/"/g, '""'); // Escapar comillas dobles
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

// Event Listeners
activateButton.addEventListener("click", fechBlog);
exportBtn.addEventListener("click", exportarCSV);

inputUser.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fechBlog();
});

// Iniciar
updateAccountCount();
