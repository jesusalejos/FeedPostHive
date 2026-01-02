// Configuración de múltiples nodos por si alguno falla
const NODOS = [
    "https://api.hive.blog",
    "https://api.deathwing.me",
    "https://api.openhive.network",
    "https://rpc.ausbit.dev"
];

let client = new dhive.Client(NODOS);
let postsData = []; 
let isSearching = false;

// Referencias DOM
const counter = document.getElementById("counterCountsHIvers");
const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");
const monthFilter = document.getElementById("monthFilter");
const listPost = document.getElementById("postList");
const exportBtn = document.getElementById("exportExcel");
const exportWordBtn = document.getElementById("exportAllWord");
const statusMsg = document.getElementById("statusMessage");

function setStatus(msg, color = "black") {
    if(statusMsg) {
        statusMsg.innerHTML = msg;
        statusMsg.style.color = color;
    }
}

// Limpiar texto de Hive (Markdown/HTML)
function limpiarTexto(body) {
    return body
        .replace(/!\[.*?\]\(.*?\)/g, "") // Imágenes Markdown
        .replace(/<img.*?>/g, "")         // Imágenes HTML
        .replace(/<.*?>/g, "")            // Tags HTML
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Links (deja solo el texto)
        .trim();
}

// Escáner progresivo (Límite 20 por seguridad de nodo)
async function escanearPosts(username, targetYear, targetMonth) {
    let result = [];
    let startAuthor = null;
    let startPermlink = null;
    const targetDate = targetYear && targetMonth ? `${targetYear}-${targetMonth}` : null;
    let checked = 0;
    const seen = new Set();

    while (true) {
        const params = { sort: 'posts', account: username, limit: 20 };
        if (startAuthor && startPermlink) {
            params.start_author = startAuthor;
            params.start_permlink = startPermlink;
        }

        try {
            const batch = await client.call('bridge', 'get_account_posts', params);
            if (!batch || batch.length === 0) break;

            let newInBatch = 0;
            for (let post of batch) {
                if (!seen.has(post.permlink)) {
                    seen.add(post.permlink);
                    newInBatch++;
                    checked++;
                    const postMonth = post.created.slice(0, 7);
                    
                    if (targetDate) {
                        if (postMonth === targetDate) result.push(post);
                    } else {
                        result.push(post);
                    }
                }
            }

            const lastDate = batch[batch.length - 1].created.slice(0, 7);
            if (targetDate) setStatus(`⏳ Escaneando historial: ${lastDate}...`, "blue");

            if (targetDate && lastDate < targetDate) break;
            if (batch.length < 20 || checked >= 2000) break;

            startAuthor = batch[batch.length - 1].author;
            startPermlink = batch[batch.length - 1].permlink;
        } catch (e) {
            console.error("Error lote:", e);
            break;
        }
    }
    return result;
}

// Función Buscar
async function fechBlog() {
    if (isSearching) return;
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const monthVal = monthFilter.value;

    if (!user) { alert("Ingresa un nombre de usuario"); return; }

    isSearching = true;
    listPost.innerHTML = "";
    exportBtn.style.display = "none";
    exportWordBtn.style.display = "none";
    postsData = [];

    try {
        let res = await escanearPosts(user, monthVal?.split('-')[0], monthVal?.split('-')[1]);
        
        if (res.length === 0) {
            setStatus("❌ No se encontraron posts en ese periodo.", "red");
            isSearching = false; return;
        }

        // Orden Ascendente (Viejo -> Nuevo)
        res.sort((a, b) => new Date(a.created) - new Date(b.created));
        postsData = res;

        setStatus(`✅ Se cargaron ${res.length} publicaciones.`, "green");
        exportBtn.style.display = "inline-block";
        exportWordBtn.style.display = "inline-block";

        res.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML = `
                <h3>${post.title}</h3>
                <p>📅 ${new Date(post.created).toLocaleDateString()} | 🕒 ${post.created.split('T')[1].slice(0, 5)}</p>
                <div class="card-btns">
                    <button class="view-btn" onclick="window.open('https://peakd.com/@${post.author}/${post.permlink}', '_blank')">Ver en Hive</button>
                    <button class="word-btn-single">Abstraer este Post</button>
                </div>
            `;
            card.querySelector('.word-btn-single').onclick = () => descargarUnWord(post);
            listPost.appendChild(card);
        });
    } catch (e) { setStatus("Error al conectar con la red Hive", "red"); }
    isSearching = false;
}

// Descargar UN post
async function descargarUnWord(post) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const bodyText = limpiarTexto(post.body);
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: post.title, heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ text: `Fecha: ${new Date(post.created).toLocaleString()}`, spacing: { after: 300 } }),
                ...bodyText.split('\n').map(l => l.trim() ? new Paragraph({ children: [new TextRun(l)], spacing: { after: 120 } }) : null).filter(p => p)
            ]
        }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${post.permlink}.docx`);
}

// Descargar TODO en un Word
async function descargarTodoWord() {
    if (postsData.length === 0) return;
    setStatus("⏳ Generando documento masivo...", "blue");

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const content = [];

    postsData.forEach((post, i) => {
        content.push(new Paragraph({ text: post.title, heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
        content.push(new Paragraph({ text: `Fecha: ${new Date(post.created).toLocaleString()}`, spacing: { after: 200 } }));
        
        limpiarTexto(post.body).split('\n').forEach(line => {
            if (line.trim()) content.push(new Paragraph({ children: [new TextRun(line)], spacing: { after: 120 } }));
        });

        if (i < postsData.length - 1) {
            content.push(new Paragraph({ text: "", pageBreakBefore: true }));
        }
    });

    const doc = new Document({ sections: [{ children: content }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Compilado_${inputUser.value}.docx`);
    setStatus("✅ Documento masivo listo", "green");
}

// Exportar CSV
function exportarCSV() {
    let csv = "\uFEFFTítulo,Fecha,Enlace\n";
    postsData.forEach(p => {
        csv += `"${p.title.replace(/"/g, '""')}",${p.created.split('T')[0]},https://peakd.com/@${p.author}/${p.permlink}\n`;
    });
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `Reporte_${inputUser.value}.csv`);
}

// Listeners
activateButton.onclick = fechBlog;
exportBtn.onclick = exportarCSV;
exportWordBtn.onclick = descargarTodoWord;
inputUser.onkeydown = (e) => { if (e.key === "Enter") fechBlog(); };

// Inicio: Probar conexión
(async function init() {
    try {
        const res = await client.call('condenser_api', 'get_account_count', []);
        counter.innerHTML = `<p style="color:green; font-weight:bold;">🟢 Conectado a Hive (${res} cuentas)</p>`;
    } catch(e) {
        counter.innerHTML = `<p style="color:red;">🔴 Error de conexión. Reintenta refrescando.</p>`;
    }
})();