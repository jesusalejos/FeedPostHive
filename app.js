const NODOS = [
    "https://api.hive.blog",
    "https://api.deathwing.me",
    "https://api.openhive.network"
];

let client = new dhive.Client(NODOS);
let postsData = []; 
let isSearching = false;

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

function limpiarTexto(body) {
    if (!body) return "";
    return body
        .replace(/!\[.*?\]\(.*?\)/g, "") 
        .replace(/<img.*?>/g, "")         
        .replace(/<.*?>/g, "")            
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") 
        .trim();
}

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

            for (let post of batch) {
                if (!seen.has(post.permlink)) {
                    seen.add(post.permlink);
                    checked++;

                    // --- FILTROS DE SEGURIDAD (MANTENIDOS) ---
                    if (post.author !== username) continue;
                    
                    let esCrosspost = false;
                    try {
                        let metadata = post.json_metadata;
                        if (typeof metadata === 'string') metadata = JSON.parse(metadata);
                        if (metadata.original_author || metadata.cross_post_author || metadata.community === "hive-132410") {
                            esCrosspost = true;
                        }
                    } catch (e) {
                        if (post.body.includes("cross-post") && post.body.length < 300) esCrosspost = true;
                    }
                    if (esCrosspost) continue;
                    if (post.title.toLowerCase().includes("cross-post from")) continue;

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
            if (batch.length < 20 || checked >= 4000) break;

            startAuthor = batch[batch.length - 1].author;
            startPermlink = batch[batch.length - 1].permlink;
        } catch (e) { break; }
    }
    return result;
}

async function fechBlog() {
    if (isSearching) return;
    const user = inputUser.value.trim().toLowerCase().replace('@', '');
    const monthVal = monthFilter.value;

    if (!user) { alert("Ingresa un usuario"); return; }

    isSearching = true;
    listPost.innerHTML = "";
    exportBtn.style.display = "none";
    exportWordBtn.style.display = "none";
    postsData = [];

    setStatus("⏳ Buscando contenido original...", "blue");

    try {
        let res = await escanearPosts(user, monthVal?.split('-')[0], monthVal?.split('-')[1]);
        
        if (res.length === 0) {
            setStatus("❌ No se encontraron publicaciones originales.", "red");
            isSearching = false; return;
        }

        res.sort((a, b) => new Date(a.created) - new Date(b.created));
        postsData = res;

        setStatus(`✅ ${res.length} posts originales detectados.`, "green");
        exportBtn.style.display = "inline-block";
        exportWordBtn.style.display = "inline-block";

        res.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML = `
                <h3>${post.title}</h3>
                <p>📅 ${new Date(post.created).toLocaleDateString()} | 🕒 ${post.created.split('T')[1].slice(0,5)}</p>
                <div class="card-btns">
                    <button class="view-btn" onclick="window.open('https://peakd.com/@${post.author}/${post.permlink}', '_blank')">Ver en Hive</button>
                    <button class="word-btn-single">Abstraer Texto</button>
                </div>
            `;
            card.querySelector('.word-btn-single').onclick = () => descargarUnWord(post);
            listPost.appendChild(card);
        });
    } catch (e) { setStatus("Error de red.", "red"); }
    isSearching = false;
}

// --- LÓGICA WORD INDIVIDUAL (Corregida) ---
async function descargarUnWord(post) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const bodyText = limpiarTexto(post.body);
    
    // Construcción del documento
    const doc = new Document({
        sections: [{
            children: [
                // 1. Título
                new Paragraph({ 
                    text: post.title, 
                    heading: HeadingLevel.HEADING_1 
                }),
                
                // 2. Fecha (Debajo del título)
                new Paragraph({ 
                    text: `Fecha de publicación: ${new Date(post.created).toLocaleString()}`, 
                    bold: true,
                    spacing: { after: 300 } // Espacio antes de empezar el texto
                }),
                
                // 3. Cuerpo del texto
                ...bodyText.split('\n').map(l => l.trim() ? new Paragraph({ 
                    children: [new TextRun(l)], 
                    spacing: { after: 120 } 
                }) : null).filter(p => p),

                // 4. URL (Al final del post)
                new Paragraph({ 
                    text: `Enlace original: https://peakd.com/@${post.author}/${post.permlink}`,
                    color: "0000FF", // Azul tipo link
                    spacing: { before: 400 } // Espacio para separarlo del texto final
                })
            ]
        }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${post.permlink}.docx`);
}

// --- LÓGICA WORD MASIVO (Corregida) ---
async function descargarTodoWord() {
    if (postsData.length === 0) return;
    setStatus("⏳ Generando documento masivo...", "blue");
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const content = [];

    postsData.forEach((post, i) => {
        // 1. Título
        content.push(new Paragraph({ 
            text: post.title, 
            heading: HeadingLevel.HEADING_1, 
            spacing: { before: 400 } 
        }));

        // 2. Fecha (Debajo del título)
        content.push(new Paragraph({ 
            text: `Fecha: ${new Date(post.created).toLocaleString()}`, 
            bold: true,
            spacing: { after: 200 } 
        }));

        // 3. Cuerpo
        limpiarTexto(post.body).split('\n').forEach(line => {
            if (line.trim()) content.push(new Paragraph({ children: [new TextRun(line)], spacing: { after: 120 } }));
        });

        // 4. URL (Al final)
        content.push(new Paragraph({ 
            text: `Link: https://peakd.com/@${post.author}/${post.permlink}`, 
            color: "0000FF",
            spacing: { before: 200, after: 200 } 
        }));

        // Salto de página
        if (i < postsData.length - 1) content.push(new Paragraph({ text: "", pageBreakBefore: true }));
    });

    const blob = await Packer.toBlob(new Document({ sections: [{ children: content }] }));
    saveAs(blob, `Compilado_${inputUser.value}.docx`);
    setStatus("✅ Documento descargado", "green");
}

function exportarCSV() {
    let csv = "\uFEFFTítulo,Fecha,Enlace\n";
    postsData.forEach(p => {
        csv += `"${p.title.replace(/"/g, '""')}",${p.created.split('T')[0]},https://peakd.com/@${p.author}/${p.permlink}\n`;
    });
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `Reporte_${inputUser.value}.csv`);
}

activateButton.onclick = fechBlog;
exportBtn.onclick = exportarCSV;
exportWordBtn.onclick = descargarTodoWord;
inputUser.onkeydown = (e) => { if (e.key === "Enter") fechBlog(); };

(async function init() {
    try {
        await client.call('condenser_api', 'get_account_count', []);
        counter.innerHTML = `<p style="color:green; font-weight:bold;">🟢 Red Hive Lista</p>`;
    } catch(e) {
        counter.innerHTML = `<p style="color:red;">🔴 Error de red.</p>`;
    }
})();