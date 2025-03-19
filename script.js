import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC7yT6d-elLakKas8rt8RY1uY7-Om1ZsDM",
    authDomain: "schedule-db715.firebaseapp.com",
    databaseURL: "https://schedule-db715-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "schedule-db715",
    storageBucket: "schedule-db715.appspot.com",
    messagingSenderId: "711789215408",
    appId: "1:711789215408:android:26306ffe84f1e014808575"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let parsedJsonData = {};  // Global variable to store parsed JSON

// ✅ Extract Data from Excel
async function extractDataFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                console.log("📊 Extracted Excel Data:", rows);
                const jsonOutput = {};
                
                let day = "", section = "";
                const headerRow = rows[0]; // First row (contains time slots)
                console.log("📌 Header Row:", headerRow);

                rows.slice(1).forEach(row => {
                    if (row[0]) {
                        day = row[0].trim();
                        console.log("📅 New Day Detected:", day);
                    }
                    if (row[1]) {
                        section = row[1].trim();
                        console.log("📂 New Section Detected:", section);
                        if (!jsonOutput[section]) jsonOutput[section] = {};
                        if (!jsonOutput[section][day]) jsonOutput[section][day] = [];
                    }

                    // ✅ Extract class details
                    for (let i = 2; i < row.length; i += 2) {
                        if (!row[i] || !row[i + 1]) continue;
                        const room = row[i].trim();
                        const subject = row[i + 1].trim();
                        const time = headerRow[i + 1]; 

                        //Improve the logic here
                        if (room === "X" && room === "---" && subject === "X" || subject === "---") {
                            console.log("⚠️ Skipping Invalid Entry:", { time, room, subject });
                            continue;
                        }

                        jsonOutput[section][day].push({
                            subject: subject, 
                            time: time,
                            room: room
                        });
                        console.log("⏳ Added Class:", { subject, time, room });
                    }
                });

                resolve(jsonOutput);
            } catch (error) {
                console.error("❌ Excel Processing Error:", error);
                reject(error);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// ✅ Parse PDF Timetable
function parseTimetable(text) {
    console.log("🔍 Parsing timetable...");
    const lines = text.split("\n").map(line => line.trim()).filter(line => line);
    console.log("📄 Extracted Lines:", lines);
    const jsonOutput = {};
    let section = "", day = "";

    for (let line of lines) {
        if (/^[A-Z]+-\d+$/i.test(line)) { 
            section = line;
            jsonOutput[section] = {};
            console.log("📁 New Section:", section);
        } else if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i.test(line)) {  
            day = line;
            jsonOutput[section][day] = [];
            console.log("📅 New Day:", day);
        } else {
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                jsonOutput[section][day].push({
                    time: parts[0], 
                    subject: parts[1], 
                    room: parts[2]
                });
                console.log("⏳ Added Class:", jsonOutput[section][day]);
            }
        }
    }
    console.log("✅ Final Parsed JSON:", jsonOutput);
    return jsonOutput;
}

// ✅ Process File (Handles PDF & Excel)
async function processFile() {
    console.log("✅ File processing started");

    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        console.log("❌ No file selected");
        document.getElementById("message").innerText = "❌ Please select a file.";
        return;
    }

    console.log("📄 Selected File:", file.name);
    
    if (file.type === "application/pdf") {
        console.log("📃 Processing PDF...");
        const extractedText = await extractTextFromPDF(file);
        console.log("📄 Extracted Text:", extractedText);
        parsedJsonData = parseTimetable(extractedText);
    } 
    else if (file.name.endsWith(".xlsx")) {  
        console.log("📊 Processing Excel...");
        parsedJsonData = await extractDataFromExcel(file);
    } 
    else {
        console.log("❌ Unsupported file format!");
        document.getElementById("message").innerText = "❌ Please upload a PDF or Excel file.";
        document.getElementById("message").style.color = "red";
        return;
    }

    console.log("📂 Parsed JSON Data:", parsedJsonData);
    document.getElementById("jsonPreview").innerText = JSON.stringify(parsedJsonData, null, 2);
    document.getElementById("uploadBtn").style.display = "block";
}

// ✅ Upload JSON to Firebase
async function uploadToFirebase() {
    console.log("✅ Upload function called"); 

    const selectedYear = document.getElementById("yearSelect").value;
    if (!selectedYear) {
        console.log("❌ No year selected");
        document.getElementById("message").innerText = "❌ Please select a year before uploading.";
        document.getElementById("message").style.color = "red";
        return;
    }

    console.log("📁 Selected Year:", selectedYear);
    console.log("📄 Parsed JSON Data:", parsedJsonData);

    const dbRef = ref(db, `data/timetable/${selectedYear}`);

    try {
        console.log("🔄 Uploading data to Firebase...");
        await update(dbRef, parsedJsonData);
        console.log("✅ Upload successful!");
        document.getElementById("message").innerText = "✅ Uploaded successfully to Firebase!";
        document.getElementById("message").style.color = "green";
    } catch (error) {
        console.error("❌ Firebase Upload Error:", error);
        document.getElementById("message").innerText = "❌ Upload failed. Check console for details.";
        document.getElementById("message").style.color = "red";
    }
}

// ✅ Expose functions globally
window.processFile = processFile;
window.uploadToFirebase = uploadToFirebase;