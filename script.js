const STORAGE_LIMIT = 10 * 1024 * 1024; // 10 MB

let files = loadFiles();

const fileInput = document.getElementById("fileInput");
const selectedFile = document.getElementById("selectedFile");


// =====================================================
// LOAD SAVED FILES
// =====================================================

function loadFiles() {

    try {

        const saved = localStorage.getItem("s3Files");

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];

    } catch (error) {

        console.error("Could not load files:", error);

        return [];

    }

}


// =====================================================
// FILE SELECTION
// =====================================================

fileInput.addEventListener("change", function () {

    if (this.files && this.files.length > 0) {

        selectedFile.textContent =
            "Selected: " + this.files[0].name;

    } else {

        selectedFile.textContent =
            "No file selected";

    }

});


// =====================================================
// UPLOAD FILE
// =====================================================

function uploadFile() {

    if (!fileInput.files || fileInput.files.length === 0) {

        showToast("⚠️ Please choose a file first.");

        return;
    }


    const file = fileInput.files[0];


    const currentStorage = files.reduce(
        (total, item) => total + Number(item.size || 0),
        0
    );


    if (currentStorage + file.size > STORAGE_LIMIT) {

        showToast("❌ Storage limit exceeded!");

        return;
    }


    const fileObject = {

        id: Date.now() + Math.random(),

        name: file.name,

        size: file.size,

        type: file.type || "Other",

        uploadedAt: new Date().toLocaleString()

    };


    files.push(fileObject);

    saveFiles();

    fileInput.value = "";

    selectedFile.textContent = "No file selected";

    renderFiles();

    showToast("✅ Object uploaded to S3!");

}


// =====================================================
// DELETE SINGLE FILE
// =====================================================

function deleteFile(id) {

    files = files.filter(file => file.id != id);

    saveFiles();

    renderFiles();

    showToast("🗑️ Object deleted.");

}


// =====================================================
// CLEAR ENTIRE BUCKET
// =====================================================

function clearAllFiles() {

    // If bucket is already empty
    if (files.length === 0) {

        showToast("📂 Bucket is already empty.");

        return;
    }


    const confirmed = confirm(
        "Are you sure you want to delete ALL objects from this bucket?"
    );


    if (!confirmed) {
        return;
    }


    // Clear JavaScript array
    files = [];


    // IMPORTANT:
    // Remove the saved S3 simulation data completely
    localStorage.removeItem("s3Files");


    // Reset search/filter
    document.getElementById("searchInput").value = "";

    document.getElementById("filterSelect").value = "all";


    // Update the entire interface
    renderFiles();


    showToast("✅ Bucket cleared successfully!");

}


// =====================================================
// SAVE FILES
// =====================================================

function saveFiles() {

    try {

        localStorage.setItem(
            "s3Files",
            JSON.stringify(files)
        );

    } catch (error) {

        console.error("Could not save files:", error);

        showToast("⚠️ Could not save bucket data.");

    }

}


// =====================================================
// FILE CATEGORY
// =====================================================

function getCategory(file) {

    const type = file.type || "";
    const name = file.name.toLowerCase();


    if (type.startsWith("image/")) {

        return "image";

    }


    if (
        type.includes("pdf") ||
        type.includes("text") ||
        type.includes("document") ||
        name.endsWith(".doc") ||
        name.endsWith(".docx") ||
        name.endsWith(".ppt") ||
        name.endsWith(".pptx") ||
        name.endsWith(".xls") ||
        name.endsWith(".xlsx")
    ) {

        return "document";

    }


    return "other";

}


// =====================================================
// FILE SIZE
// =====================================================

function formatSize(bytes) {

    bytes = Number(bytes) || 0;


    if (bytes === 0) {
        return "0 KB";
    }


    const units = ["B", "KB", "MB", "GB"];


    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );


    return (
        (bytes / Math.pow(1024, index)).toFixed(2)
        + " "
        + units[index]
    );

}


// =====================================================
// FILE ICON
// =====================================================

function getFileIcon(file) {

    const category = getCategory(file);


    if (category === "image") {
        return "🖼️";
    }


    if (category === "document") {
        return "📄";
    }


    return "📦";

}

// =====================================================
// SMART STORAGE MANAGEMENT - ENHANCEMENT
// =====================================================

function updateSmartStorage() {

    const totalSize =
        files.reduce(
            (total, file) =>
                total + Number(file.size || 0),
            0
        );


    const percentage =
        Math.min(
            (totalSize / STORAGE_LIMIT) * 100,
            100
        );


    // Storage percentage
    document.getElementById("smartPercentage")
        .textContent =
        percentage.toFixed(1) + "%";


    document.getElementById("smartProgress")
        .style.width =
        percentage + "%";


    // Find largest object
    if (files.length === 0) {

        document.getElementById("largestFile")
            .textContent = "No objects";

        document.getElementById("largestFileSize")
            .textContent = "—";

        document.getElementById("storageStatus")
            .textContent = "✓ Healthy";

        document.getElementById("storageRecommendation")
            .textContent =
            "Storage usage is within normal limits.";

        document.getElementById("smartRecommendation")
            .textContent =
            "💡 Upload files to receive storage optimization insights.";

        return;
    }


    const largest =
        files.reduce(
            (largest, file) =>
                Number(file.size) > Number(largest.size)
                    ? file
                    : largest
        );


    document.getElementById("largestFile")
        .textContent =
        largest.name;


    document.getElementById("largestFileSize")
        .textContent =
        formatSize(largest.size);


    // Storage status
    const status =
        document.getElementById("storageStatus");

    const recommendation =
        document.getElementById("storageRecommendation");

    const smartRecommendation =
        document.getElementById("smartRecommendation");


    if (percentage >= 90) {

        status.textContent =
            "🚨 Critical";

        recommendation.textContent =
            "Bucket is almost full.";

        smartRecommendation.innerHTML =
            "🚨 <strong>Critical storage usage.</strong> " +
            "Consider removing unused or large objects immediately.";

    }

    else if (percentage >= 70) {

        status.textContent =
            "⚠️ Attention";

        recommendation.textContent =
            "Storage usage is getting high.";

        smartRecommendation.innerHTML =
            "⚠️ <strong>Storage optimization recommended.</strong> " +
            "Review your largest objects and remove unnecessary files.";

    }

    else {

        status.textContent =
            "✓ Healthy";

        recommendation.textContent =
            "Storage usage is within normal limits.";

        smartRecommendation.innerHTML =
            "💡 <strong>Optimization tip:</strong> " +
            largest.name +
            " is your largest object at " +
            formatSize(largest.size) +
            ".";

    }

}
// =====================================================
// RENDER FILE LIST
// =====================================================

function renderFiles() {

    const list =
        document.getElementById("fileList");


    const search =
        document.getElementById("searchInput")
            .value
            .toLowerCase();


    const filter =
        document.getElementById("filterSelect")
            .value;


    const filteredFiles =
        files.filter(file => {

            const matchesSearch =
                file.name
                    .toLowerCase()
                    .includes(search);


            const matchesFilter =
                filter === "all" ||
                getCategory(file) === filter;


            return matchesSearch && matchesFilter;

        });


    if (filteredFiles.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                <div>📂</div>
                <h3>No objects found</h3>
                <p>Try uploading a file or changing your filter.</p>
            </div>
        `;

    } else {

        list.innerHTML =
            filteredFiles.map(file => `

                <div class="file-row">

                    <div class="file-name">

                        <span>
                            ${getFileIcon(file)}
                        </span>

                        ${escapeHTML(file.name)}

                    </div>


                    <div class="file-meta">
                        ${formatSize(file.size)}
                    </div>


                    <div class="file-meta">
                        ${getCategory(file)}
                    </div>


                    <div>

                        <button
                            class="delete-btn"
                            onclick="deleteFile(${file.id})">

                            Delete

                        </button>

                    </div>

                </div>

            `).join("");

    }


    updateAnalytics();
    updateSmartStorage();

}


// =====================================================
// ANALYTICS
// =====================================================

function updateAnalytics() {

    const totalSize =
        files.reduce(
            (total, file) =>
                total + Number(file.size || 0),
            0
        );


    const images =
        files.filter(
            file => getCategory(file) === "image"
        ).length;


    const documents =
        files.filter(
            file => getCategory(file) === "document"
        ).length;


    const percentage =
        Math.min(
            (totalSize / STORAGE_LIMIT) * 100,
            100
        );


    document.getElementById("objectCount")
        .textContent = files.length;


    document.getElementById("storageUsed")
        .textContent = formatSize(totalSize);


    document.getElementById("imageCount")
        .textContent = images;


    document.getElementById("documentCount")
        .textContent = documents;


    document.getElementById("storagePercentage")
        .textContent =
        percentage.toFixed(1) + "%";


    document.getElementById("storageText")
        .textContent =
        formatSize(totalSize) + " used";


    document.getElementById("progressBar")
        .style.width =
        percentage + "%";


    const warning =
        document.getElementById("warningBox");


    if (percentage >= 70) {

        warning.classList.remove("hidden");

    } else {

        warning.classList.add("hidden");

    }

}


// =====================================================
// ESCAPE FILE NAME
// =====================================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


// =====================================================
// TOAST
// =====================================================

function showToast(message) {

    const toast =
        document.getElementById("toast");


    toast.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


// =====================================================
// DARK MODE
// =====================================================

function toggleTheme() {

    document.body.classList.toggle("dark");


    const isDark =
        document.body.classList.contains("dark");


    localStorage.setItem(
        "s3DarkMode",
        isDark ? "true" : "false"
    );


    updateThemeButton();

}


// =====================================================
// UPDATE THEME BUTTON
// =====================================================

function updateThemeButton() {

    const button =
        document.getElementById("themeToggle");


    const isDark =
        document.body.classList.contains("dark");


    button.textContent =
        isDark ? "☀️" : "🌙";


    button.title =
        isDark
            ? "Switch to light mode"
            : "Switch to dark mode";

}


// =====================================================
// LOAD DARK MODE
// =====================================================

function loadTheme() {

    const darkMode =
        localStorage.getItem("s3DarkMode");


    if (darkMode === "true") {

        document.body.classList.add("dark");

    }


    updateThemeButton();

}


// =====================================================
// INITIALIZE
// =====================================================

loadTheme();

renderFiles();