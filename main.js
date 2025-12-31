// Configuración de la API con un nodo alternativo por si el principal falla
hive.api.setOptions({ url: 'https://api.hive.blog' });

let postsData = []; 

// Elementos del DOM
const counter = document.getElementById("counterCountsHIvers");
const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");
const monthFilter = document.getElementById("monthFilter");
const listPost = document.getElementById("postList");
const exportBtn = document.getElementById("exportExcel");

// --- Contador de Cuentas ---
function updateAccountCount() {
    hive.api.getAccountCount(function(err, result) {
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
    if(exportBtn) exportBtn.style.display = "none";
    postsData = [];

    const query = {
        tag: user,
        limit: 50 
    };

    // Usamos el callback estándar de hive-js
    hive.api.getDiscussionsByBlog(query, function(err, res) {
        
        // Verificación exhaustiva de la respuesta
        if (err || !res) {
            listPost.innerHTML = "<h2 style='color: #900; text-align:center;'>Error de conexión con Hive</h2>";
            return;
        }

        // A veces la respuesta viene dentro de res.result dependiendo de la versión
        const rawPosts = Array.isArray(res) ? res : (res.result && Array.isArray(res.result) ? res.result : null);

        if (!rawPosts) {
            listPost.innerHTML = "<h2 style='color: #900; text-align:center;'>No se pudo procesar la respuesta de la blockchain</h2>";
            return;
        }

        // Aplicar filtros
        let filteredPosts = rawPosts;
        if (selectedMonth) {
            filteredPosts = rawPosts.filter(function(post) {
                return post.created && post.created.indexOf(selectedMonth) === 0;
            });
        }

        if (filteredPosts.length === 0) {
            listPost.innerHTML = "<h2 style='text-align:center;'>No se encontraron posts en este periodo.</h2>";
            return;
        }

        postsData = filteredPosts;
        listPost.innerHTML = "";
        if(exportBtn) exportBtn.style.display = "inline-block";

        // Renderizado
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
            var created = new Date(post.created).toDateString();

            var card = document.createElement("div");
            card.className = "post-card";
            card.style.background = "white";
            card.style.padding = "20px";
            card.style.marginTop = "20px";
            card.style.borderRadius = "12px";
            card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";

            card.innerHTML = 
                "<h2>" + post.title + "</h2>" +
                "<p>by " + post.author + "</p>" +
                "<div style='display:flex; justify-content:center'>" +
                    "<img src='" + image + "' style='max-width: 450px; width: 100%; border-radius: 10px;'>" +
                "</div>" +
                "<p>📅 " + created + "</p>" +
                "<button class='view-btn' onclick=\"window.open('" + urlPlus + "')\">Ver post...</button>";

            listPost.appendChild(card);
        }
    });
}

function exportarCSV() {
    if (postsData.length === 0) return;
    var csv = "\uFEFFTítulo,Fecha,Enlace\n";
    for (var i = 0; i < postsData.length; i++) {
        var p = postsData[i];
        var cleanTitle = p.title.replace(/,/g, "");
        var date = p.created.split('T')[0];
        var link = "https://peakd.com" + p.url;
        csv += "\"" + cleanTitle + "\"," + date + "," + link + "\n";
    }
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "posts_hive.csv";
    a.click();
}

// Listeners
if(activateButton) activateButton.addEventListener("click", fechBlog);
if(exportBtn) exportBtn.addEventListener("click", exportarCSV);

// Inicialización
updateAccountCount();
setInterval(updateAccountCount, 300000);
