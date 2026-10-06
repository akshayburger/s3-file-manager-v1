const LIMIT = 10 * 1024 * 1024;
let files = loadFiles();

const $ = id => document.getElementById(id);

function loadFiles() {
    try {
        const data = JSON.parse(localStorage.getItem("s3Files") || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveFiles() {
    localStorage.setItem("s3Files", JSON.stringify(files));
}

function category(file) {
    const type = file.type || "";
    const name = file.name.toLowerCase();
    if (type.startsWith("image/")) return "image";
    if (type.includes("pdf") || type.includes("text") || type.includes("document") ||
        /\.(doc|docx|ppt|pptx|xls|xlsx)$/.test(name)) return "document";
    return "other";
}

function icon(file) {
    return category(file) === "image" ? "🖼️" : category(file) === "document" ? "📄" : "📦";
}

function size(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B","KB","MB","GB"];
    const i = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), 3);
    return `${(bytes/Math.pow(1024,i)).toFixed(2)} ${units[i]}`;
}

function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 2200);
}

function render() {
    const search = $("searchInput").value.toLowerCase();
    const filter = $("filterSelect").value;

    const shown = files.filter(f =>
        f.name.toLowerCase().includes(search) &&
        (filter === "all" || category(f) === filter)
    );

    if (!shown.length) {
        $("fileList").innerHTML = `<div class="empty"><div>📂</div><h3>No objects found</h3><p>Upload a file or change your search/filter.</p></div>`;
    } else {
        $("fileList").innerHTML = shown.map(f => `
            <div class="file-row">
                <button class="file-name" onclick="downloadFile('${f.id}')" title="Download ${escapeHtml(f.name)}">
                    ${icon(f)} ${escapeHtml(f.name)}
                </button>
                <div class="file-meta">${size(f.size)}</div>
                <div class="file-meta">${category(f)}</div>
                <div class="file-actions">
                    <button class="download-btn" onclick="downloadFile('${f.id}')">Download</button>
                    <button class="delete-btn" onclick="deleteFile('${f.id}')">Delete</button>
                </div>
            </div>
        `).join("");
    }

    updateAnalytics();
    updateSmart();
}

function updateAnalytics() {
    const total = files.reduce((n,f) => n + Number(f.size || 0), 0);
    const pct = Math.min(total / LIMIT * 100, 100);

    $("objectCount").textContent = files.length;
    $("storageUsed").textContent = size(total);
    $("imageCount").textContent = files.filter(f => category(f) === "image").length;
    $("documentCount").textContent = files.filter(f => category(f) === "document").length;
    $("storagePercentage").textContent = `${pct.toFixed(1)}%`;
    $("storageText").textContent = `${size(total)} used`;
    $("progressBar").style.width = `${pct}%`;
    $("warningBox").classList.toggle("hidden", pct < 70);
}

function updateSmart() {
    const total = files.reduce((n,f) => n + Number(f.size || 0), 0);
    const pct = Math.min(total / LIMIT * 100, 100);

    $("smartPercentage").textContent = `${pct.toFixed(1)}%`;
    $("smartProgress").style.width = `${pct}%`;

    if (!files.length) {
        $("largestFile").textContent = "No objects";
        $("largestFileSize").textContent = "—";
        $("storageStatus").textContent = "✓ Healthy";
        $("storageRecommendation").textContent = "Storage usage is within normal limits.";
        $("smartRecommendation").textContent = "💡 Upload files to receive storage optimization insights.";
        return;
    }

    const largest = files.reduce((a,b) => Number(a.size) >= Number(b.size) ? a : b);
    $("largestFile").textContent = largest.name;
    $("largestFileSize").textContent = size(largest.size);

    if (pct >= 90) {
        $("storageStatus").textContent = "🚨 Critical";
        $("storageRecommendation").textContent = "Bucket is almost full.";
        $("smartRecommendation").innerHTML = "🚨 <strong>Critical storage usage.</strong> Review and remove unnecessary objects.";
    } else if (pct >= 70) {
        $("storageStatus").textContent = "⚠️ Attention";
        $("storageRecommendation").textContent = "Storage usage is getting high.";
        $("smartRecommendation").innerHTML = "⚠️ <strong>Optimization recommended.</strong> Review your largest objects.";
    } else {
        $("storageStatus").textContent = "✓ Healthy";
        $("storageRecommendation").textContent = "Storage usage is within normal limits.";
        $("smartRecommendation").innerHTML = `💡 <strong>Optimization tip:</strong> ${escapeHtml(largest.name)} is your largest object at ${size(largest.size)}.`;
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function upload() {
    const input = $("fileInput");
    if (!input.files.length) {
        toast("⚠️ Please choose a file first.");
        return;
    }

    const file = input.files[0];
    const used = files.reduce((n,f) => n + Number(f.size || 0), 0);

    if (used + file.size > LIMIT) {
        toast("❌ Storage limit exceeded!");
        return;
    }

    let content;
    try {
        content = await readFileAsDataURL(file);
    } catch {
        toast("❌ Could not read the selected file.");
        return;
    }

    const record = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        uploadedAt: new Date().toLocaleString(),
        content
    };

    files.push(record);

    try {
        saveFiles();
    } catch {
        files.pop();
        toast("❌ Could not save file. Browser storage is full.");
        return;
    }

    input.value = "";
    $("selectedFile").textContent = "No file selected";
    render();
    toast("✅ Object uploaded to S3!");
}

function downloadFile(id) {
    const file = files.find(f => String(f.id) === String(id));
    if (!file) {
        toast("❌ File not found.");
        return;
    }

    if (!file.content) {
        toast("⚠️ This file has no stored data. Please re-upload it to download.");
        return;
    }

    const link = document.createElement("a");
    link.href = file.content;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast("⬇️ Download started.");
}

function deleteFile(id) {
    files = files.filter(f => String(f.id) !== String(id));
    saveFiles();
    render();
    toast("🗑️ Object deleted.");
}

function clearBucket() {
    if (!files.length) {
        toast("📂 Bucket is already empty.");
        return;
    }

    if (!confirm("Are you sure you want to delete ALL objects from this bucket?")) return;

    files = [];
    localStorage.removeItem("s3Files");
    $("searchInput").value = "";
    $("filterSelect").value = "all";
    render();
    toast("✅ Bucket cleared successfully!");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    localStorage.setItem("s3DarkMode", dark ? "true" : "false");
    $("themeToggle").textContent = dark ? "☀️" : "🌙";
}

function loadTheme() {
    const dark = localStorage.getItem("s3DarkMode") === "true";
    document.body.classList.toggle("dark", dark);
    $("themeToggle").textContent = dark ? "☀️" : "🌙";
}

$("fileInput").addEventListener("change", () => {
    $("selectedFile").textContent = $("fileInput").files.length
        ? `Selected: ${$("fileInput").files[0].name}`
        : "No file selected";
});
$("uploadBtn").addEventListener("click", upload);
$("clearBucket").addEventListener("click", clearBucket);
$("searchInput").addEventListener("input", render);
$("filterSelect").addEventListener("change", render);
$("themeToggle").addEventListener("click", toggleTheme);

loadTheme();
render();
