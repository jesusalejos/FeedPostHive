// Usamos un nodo más confiable y rápido
hive.api.setOptions({ url: 'https://api.deathwing.me' });

let postsData = []; 

const counter = document.getElementById("counterCountsHIvers");
const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");
const monthFilter = document.getElementById("monthFilter");
const listPost = document.getElementById("postList");
const exportBtn = document.getElementById("exportExcel");

// --- Contador de Cuentas ---
function updateAccountCount() {
    // Usamos el método directo de condenser_api para evitar errores de compatibilidad
    hive.api.call('condenser_api.get_account_count', [], function(err, result) {
        if (!err && counter) {
            counter.innerHTML = `<p>Cuentas registradas</p> ${result}`;
        }
    });
}

// --- Función Principal ---
function fechBlog() {
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const selectedMonth = monthFilter.value; 

    if (!user) {
        alert("Por favor, introduce un nombre de usuario");
        return;
    }

    listPost.innerHTML = "<h2 style='text-align:center'>Conectando con la Blockchain...</h2>";
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    // Cambiamos a 'get_discussions_by_blog' vía call para asegurar el formato de respuesta
    hive.api.call('condenser_api.get_discussions_by_blog', [{ tag: user, limit: 50 }], function(err, res) {
        
        if (err || !res) {
            console.error("Detalle del error:", err);
            listPost.innerHTML = "<h2 style='color: #900; text-align:center;'>Error de conexión: El nodo no responde</h2>";
            return;
        }

        // Validamos que sea un array
        if (!Array.isArray(res)) {
            listPost.innerHTML = "<h2 style='color: #900; text-align:center;'>Respuesta inesperada de la API</h2>";
            return;
        }

        // Filtrado por mes
        let filteredPosts = res;
        if (selectedMonth) {
            filteredPosts = res.filter(function(post) {
                return post.created && post.created.indexOf(selectedMonth) === 0;
            });
        }

        if (filteredPosts.length === 0) {
            listPost.innerHTML = "<h2 style='text-align:center;'>No se encontraron posts. Revisa el usuario o el mes.</h2>";
            return;
        }

        postsData = filteredPosts;
        listPost.innerHTML = "";
        if(exportBtn) exportBtn.style.display = "inline-block";

        // Renderizado con bucle seguro
        for (var i = 0; i < filteredPosts.length; i++) {
            var post = filteredPosts[i];
            var image = 'https://images.hive.blog/DQmPZ979S6NfX8H7H7H7H7H7H7H7H7H7/noimage.png';
            
            try {
                var metadata = JSON.parse(post.json_metadata);
                if (metadata.image && metadata.image[0]) {
                    image = metadata.image[0];
                }
            } catch (e) {}

            var urlPlus = "https://peakd.com" + post.url;
            var createdDate = new Date(post.created).toLocaleDateString();

            var card = document.createElement("div");
            card.className = "post-card";
            
            card.innerHTML = 
                "<h2>" + post.title + "</h2>" +
                "<p>by " + post.author + "</p>" +
                "<div style='display:flex; justify-content:center'>" +
                    "<img src='" + image + "' style='max-width: 450px; width: 100%; border-radius: 10px;'>" +
                "</div>" +
                "<p>📅 " + createdDate + "</p>" +
                "<button class='view-btn' onclick=\"window.open('" + urlPlus + "')\">Ver post...</button>";

            listPost.appendChild(card);
        }
    });
}

// --- Exportar ---
function exportarCSV() {
    if (postsData.length === 0) return;
    var csv = "\uFEFFTítulo,Fecha,Enlace\n";
    for (var i = 0; i < postsData.length; i++) {
        var p = postsData[i];
        var cleanTitle = p.title.replace(/,/g, "");
        var date = p.created.split('T')[0];
        csv += "\"" + cleanTitle + "\"," + date + ",https://peakd.com" + p.url + "\n";
    }
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "posts_hive.csv";
    a.click();
}

// Listeners
if(activateButton) activateButton.addEventListener("click", fechBlog);
if(exportBtn) exportBtn.addEventListener("click", exportarCSV);

// Inicialización
updateAccountCount();
setInterval(updateAccountCount, 300000);
