const ALERT_API_URL = "https://v3jrp0w8v4.execute-api.us-east-1.amazonaws.com"
const LIMIT = 10 * 1024 * 1024;
const DB_NAME = "s3FileManager";
const STORE = "objects";

const $ = id => document.getElementById(id);
let files = loadFiles();

function loadFiles() {
    try {
        const data = JSON.parse(localStorage.getItem("s3Files") || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function metadataOnly(list) {
    return list.map(({ id, name, size, type, uploadedAt }) => ({
        id, name, size, type, uploadedAt
    }));
}

function saveFiles() {
    localStorage.setItem("s3Files", JSON.stringify(metadataOnly(files)));
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbRequest(mode, action) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }));
}

function putObject(id, blob) {
    return dbRequest("readwrite", store => store.put(blob, id));
}

function getObject(id) {
    return dbRequest("readonly", store => store.get(id));
}

function deleteObject(id) {
    return dbRequest("readwrite", store => store.delete(id));
}

function clearObjects() {
    return dbRequest("readwrite", store => store.clear());
}

function dataUrlToBlob(dataUrl) {
    const [header, data] = String(dataUrl).split(",");
    const mime = (header.match(/:(.*?);/) || [])[1] || "application/octet-stream";
    const binary = atob(data || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

async function migrateOldContents() {
    let changed = false;

    for (const file of files) {
        if (!file.content) continue;
        try {
            await putObject(file.id, dataUrlToBlob(file.content));
        } catch {
            /* keep going so metadata can still be compacted */
        }
        delete file.content;
        changed = true;
    }

    if (changed) {
        try {
            saveFiles();
        } catch {
            localStorage.removeItem("s3Files");
            saveFiles();
        }
    }
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

function getStorageLevel(pct) {
    if (pct >= 90) return "critical";
    if (pct >= 70) return "high";
    return "normal";
}

async function sendStorageAlert(pct, total, largestFile) {
    if (pct < 70) return;

    try {
        const response = await fetch(ALERT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                storagePercentage: Number(pct.toFixed(1)),
                storageUsed: size(total),
                largestObject: largestFile
                    ? largestFile.name
                    : "None"
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        console.log("Storage alert published successfully.");
    } catch (error) {
        console.error("Storage alert failed:", error);
    }
}

async function checkStorageAlert(pct, total, largestFile) {
    const levels = {
        normal: 0,
        high: 1,
        critical: 2
    };

    const currentLevel = getStorageLevel(pct);
    const previousLevel =
        localStorage.getItem("s3StorageAlertLevel") || "normal";

    // Save the new level before awaiting anything.
    // This prevents duplicate alerts when the UI re-renders.
    if (currentLevel === previousLevel) return;

    localStorage.setItem("s3StorageAlertLevel", currentLevel);

    // Notify only when moving UP to a more severe level.
    if (levels[currentLevel] > levels[previousLevel]) {
        await sendStorageAlert(pct, total, largestFile);
    }
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
        checkStorageAlert(pct, total, null);
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
    checkStorageAlert(pct, total, largest);
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

    const record = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        uploadedAt: new Date().toLocaleString()
    };

    try {
        await putObject(record.id, file);
        files.push(record);
        saveFiles();
    } catch {
        files = files.filter(f => f.id !== record.id);
        try {
            await deleteObject(record.id);
        } catch { /* ignore */ }
        toast("❌ Could not save file. Browser storage is full.");
        return;
    }

    input.value = "";
    $("selectedFile").textContent = "No file selected";
    render();
    toast("✅ Object uploaded to S3!");
}

async function downloadFile(id) {
    const file = files.find(f => String(f.id) === String(id));
    if (!file) {
        toast("❌ File not found.");
        return;
    }

    let blob = await getObject(id);
    if (!blob && file.content) blob = dataUrlToBlob(file.content);

    if (!blob) {
        toast("⚠️ This file has no stored data. Please re-upload it to download.");
        return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("⬇️ Download started.");
}

async function deleteFile(id) {
    files = files.filter(f => String(f.id) !== String(id));
    saveFiles();
    try {
        await deleteObject(id);
    } catch { /* ignore */ }
    render();
    toast("🗑️ Object deleted.");
}

async function clearBucket() {
    if (!files.length) {
        toast("📂 Bucket is already empty.");
        return;
    }

    if (!confirm("Are you sure you want to delete ALL objects from this bucket?")) return;

    files = [];
    localStorage.removeItem("s3Files");
    try {
        await clearObjects();
    } catch { /* ignore */ }
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
migrateOldContents().then(render);
