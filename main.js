// Configuración de la API
hive.api.setOptions({ url: 'https://api.hive.blog' });
const api = hive.api;

let postsData = []; // Almacén para exportar

// Elementos del DOM
const counter = document.getElementById("counterCountsHIvers");
const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");
const monthFilter = document.getElementById("monthFilter");
const listPost = document.getElementById("postList");
const exportBtn = document.getElementById("exportExcel");

// --- Contador de Cuentas ---
function updateAccountCount() {
    api.getAccountCount(function(err, result) {
        if (!err) {
            counter.innerHTML = `<p>Cuentas registradas</p> ${result}`;
        }
    });
}

// --- Función Principal de Búsqueda ---
function fechBlog() {
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; // Formato YYYY-MM

    if (!user) {
        alert("Por favor, introduce un nombre de usuario");
        return;
    }

    listPost.innerHTML = "<h2 style='text-align:center'>Buscando en la blockchain...</h2>";
    exportBtn.style.display = "none";
    postsData = [];

    // Query para obtener los últimos 100 posts (necesario para tener rango de fechas)
    const query = {
        tag: user,
        limit: 100
    };

    api.getDiscussionsByBlog(query, function(err, res) {
        if (err || !res || res.length === 0) {
            listPost.innerHTML = "<h2 style='color: #900;'>Usuario no válido o sin contenido</h2>";
            return;
        }

        let filteredPosts = res;

        // Filtrar por mes si el usuario seleccionó uno
        if (selectedMonth) {
            filteredPosts = res.filter(post => post.created.startsWith(selectedMonth));
        }

        if (filteredPosts.length === 0) {
            listPost.innerHTML = "<h2>No se encontraron posts en este mes específico.</h2>";
            return;
        }

        postsData = filteredPosts;
        listPost.innerHTML = "";
        exportBtn.style.display = "inline-block";

        filteredPosts.forEach(post => {
            const json = JSON.parse(post.json_metadata);
            const image = (json.image && json.image[0]) ? json.image[0] : 'https://images.hive.blog/DQmPZ979S6NfX8H7H7H7H7H7H7H7H7H7/noimage.png';
            const urlPlus = `https://peakd.com${post.url}`;
            const created = new Date(post.created).toDateString();

            // Creación de elementos según tu lógica original
            const container = document.createElement("div");
            container.className = "post-card";

            const containerTitle = document.createElement("h2");
            containerTitle.innerText = post.title;

            const containerAuthor = document.createElement("p");
            containerAuthor.innerText = `by ${post.author}`;

            const centerImage = document.createElement("div");
            const containerImage = document.createElement("img");
            containerImage.setAttribute("src", image);
            centerImage.append(containerImage);

            const containerCreated = document.createElement("p");
            containerCreated.innerText = created;

            const buttonLink = document.createElement("button");
            buttonLink.className = "view-btn";
            buttonLink.innerHTML = "Ver post...";

            container.append(containerTitle, containerAuthor, centerImage, containerCreated, buttonLink);
            listPost.append(container);

            buttonLink.addEventListener("click", () => {
                window.open(urlPlus);
            });
        });
    });
}

// --- Función para Exportar CSV ---
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

// --- Listeners ---
activateButton.addEventListener("click", fechBlog);
exportBtn.addEventListener("click", exportarCSV);

inputUser.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fechBlog();
});

// Inicialización
window.onload = () => {
    updateAccountCount();
    setInterval(updateAccountCount, 300000);
};
