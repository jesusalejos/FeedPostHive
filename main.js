// Configuración de la API
hive.api.setOptions({ url: 'https://api.hive.blog' });
const api = hive.api;

let postsData = []; 

const counter = document.getElementById("counterCountsHIvers");
const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");
const monthFilter = document.getElementById("monthFilter");
const listPost = document.getElementById("postList");
const exportBtn = document.getElementById("exportExcel");

// --- Contador de Cuentas ---
function updateAccountCount() {
    api.getAccountCount(function(err, result) {
        if (!err && counter) {
            counter.innerHTML = `<p>Cuentas registradas</p> ${result}`;
        }
    });
}

// --- Función Principal de Búsqueda ---
function fechBlog() {
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; 

    if (!user) {
        alert("Por favor, introduce un nombre de usuario");
        return;
    }

    listPost.innerHTML = "<h2 style='text-align:center'>Buscando en la blockchain...</h2>";
    exportBtn.style.display = "none";
    postsData = [];

    const query = {
        tag: user,
        limit: 50 // Bajamos el límite para mayor estabilidad inicial
    };

    api.getDiscussionsByBlog(query, function(err, res) {
        // VALIDACIÓN CRUCIAL: Verificamos si res es realmente una lista
        if (err || !res || !Array.isArray(res)) {
            listPost.innerHTML = "<h2 style='color: #900; text-align:center;'>Error: Usuario no encontrado o problema de conexión</h2>";
            console.error("Error en API:", err);
            return;
        }

        let filteredPosts = res;

        // Filtrar por mes
        if (selectedMonth) {
            filteredPosts = res.filter(post => post.created && post.created.startsWith(selectedMonth));
        }

        if (filteredPosts.length === 0) {
            listPost.innerHTML = "<h2 style='text-align:center;'>No se encontraron posts para este periodo.</h2>";
            return;
        }

        postsData = filteredPosts;
        listPost.innerHTML = "";
        exportBtn.style.display = "inline-block";

        // Ahora forEach funcionará seguro porque validamos que sea Array
        filteredPosts.forEach(post => {
            let image = 'https://images.hive.blog/DQmPZ979S6NfX8H7H7H7H7H7H7H7H7H7/noimage.png';
            
            try {
                const metadata = JSON.parse(post.json_metadata);
                if (metadata.image && metadata.image[0]) {
                    image = metadata.image[0];
                }
            } catch (e) {
                console.log("Error parseando metadata");
            }

            const urlPlus = `https://peakd.com${post.url}`;
            const created = new Date(post.created).toDateString();

            const container = document.createElement("div");
            container.className = "post-card";

            container.innerHTML = `
                <h2>${post.title}</h2>
                <p>by ${post.author}</p>
                <div style="display:flex; justify-content:center">
                    <img src="${image}" style="max-width: 450px; width: 100%; border-radius: 10px;">
                </div>
                <p>📅 ${created}</p>
                <button class="view-btn" onclick="window.open('${urlPlus}')">Ver post...</button>
            `;

            listPost.append(container);
        });
    });
}

function exportarCSV() {
    if (postsData.length === 0) return;
    let csv = "\uFEFFTítulo,Fecha,Enlace\n";
    postsData.forEach(p => {
        const cleanTitle = p.title.replace(/,/g, "");
        const date = p.created.split('T')[0];
        const link = `https://peakd.com${p.url}`;
        csv += `"${cleanTitle}",${date},${link}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `posts_${inputUser.value}.csv`;
    a.click();
}

// Listeners
activateButton.addEventListener("click", fechBlog);
exportBtn.addEventListener("click", exportarCSV);

// Inicialización
updateAccountCount();
setInterval(updateAccountCount, 300000);
