// Elements
const emptyListMessage = document.getElementById("empty-list-message");
const messageBox = document.getElementsByClassName("footer-text");
const settingSection = document.getElementById("setting-section");
const homeSection = document.getElementById("home-section");
const container = document.getElementById("container");
const noteList = document.getElementById("note-list");

// Buttons
const downloadAllNotesAsTextButton = document.getElementById("download-all-notes-text");
const downloadAllNotesAsCSVButton = document.getElementById("download-all-notes-csv");
const downloadNotesAsTextButton = document.getElementById("download-notes-text");
const downloadNotesAsCSVButton = document.getElementById("download-notes-csv");
const clearAllDataButton = document.getElementById("clear-all-data");
const deleteAllButton = document.getElementById("delete-all-notes");
const highlighterSwitch = document.getElementById("highlighter");
const closeSettingButton = document.getElementById("close-setting");
const openSettingButton = document.getElementById("open-setting");
const mainSwitch = document.getElementById('main-switch');

// For opening and closing setting/more section
openSettingButton.addEventListener("click", toggleSettingSection);
closeSettingButton.addEventListener("click", toggleSettingSection);

// Setting status of switch when its changes
mainSwitch.addEventListener('change', function () {
    chrome.storage.sync.set({ 'status': mainSwitch.checked });
    showBadgeText(mainSwitch.checked);
});

// Getting previous value of switches and updating it
chrome.storage.sync.get({ 'status': true, 'highlight': false }, function (res) {
    mainSwitch.checked = res.status;
    highlighterSwitch.checked = res.highlight;
    showBadgeText(mainSwitch.checked);
})

// Home section's functionality for current tab
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // TabID = hostname of the current website, which is used for storing the notes
    let url = new URL(tabs[0].url);
    let tabId = url.hostname.toString();

    // Get notes from storage and display it
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let all_notes = result.all_notes;
        showAllNotes(all_notes, tabId);
    });

    // For downloading or deleting all notes of current site
    downloadNotesAsTextButton.addEventListener("click", () => downloadNotes(tabId, 'plain'));
    downloadNotesAsCSVButton.addEventListener("click", () => downloadNotes(tabId, 'csv'));
    deleteAllButton.addEventListener("click", () => deleteAllNotes(tabId));
});

// Setting Page's functionality
// For downloading or deleting notes of all sites
downloadAllNotesAsTextButton.addEventListener("click", () => downloadAllNotes('plain'));
downloadAllNotesAsCSVButton.addEventListener("click", () => downloadAllNotes('csv'));
clearAllDataButton.addEventListener("click", () => clearAllData());

// For highlighting text
highlighterSwitch.addEventListener("change", function () {
    let switchStatus = highlighterSwitch.checked;
    chrome.storage.sync.set({ 'highlight': switchStatus });
    let message = (switchStatus) ? "ON" : "OFF";
    displayMessage("Highlighter - " + message, 1);
});


function showAllNotes(all_notes, tabId) {
    let notes = all_notes[tabId] || [];

    // If notes are empty then display empty msg and return
    if (!notes || notes.length === 0) {
        showEmptyNotesMessage();
        return;
    }

    // Create notediv element for each notes and display it by recent added order
    for (let index = notes.length - 1; index >= 0; --index) {
        let note = notes[index];
        let noteDiv = document.createElement("div");        // Note Block
        let noteText = document.createElement("p");         // Note-text content block
        let deleteBtn = document.createElement("button");   // Note-delete button

        noteDiv.classList.add("note");
        deleteBtn.classList.add("delete-note-button");
        deleteBtn.innerHTML = '<i class="fa-regular fa-square-minus"></i>';
        deleteBtn.title = "Delete";
        noteText.innerText = note;

        // Delete the individual note
        deleteBtn.addEventListener("click", function () {
            notes.splice(index, 1);
            all_notes[tabId] = notes;
            chrome.storage.sync.set({ 'all_notes': all_notes });
            displayMessage("Deleted");

            // After deleting a note, display all notes again
            noteList.innerHTML = "";
            showAllNotes(all_notes, tabId);
        });

        // Copy the note to clopboard
        noteText.addEventListener('click', (e) => copyNoteToClipboard(e.target.innerText));

        noteDiv.appendChild(noteText);
        noteDiv.appendChild(deleteBtn);
        noteList.appendChild(noteDiv);
    };
}

function downloadNotes(tabId, format) {
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let notes = result.all_notes[tabId] || [];
        let notesText = "", notesCSV = "Notes\n";

        // If notes are empty then return
        if (!notes || notes.length === 0) return;

        // Making Readable format of notes
        notes.forEach((note, index) => {
            notesText += `${index + 1})\n${note}\n\n`;
            let noteContent = note.replace(/"/g, '""'); // Replace all " with ""
            noteContent = noteContent.replace(/\r?\n/g, '\n');
            notesCSV += `" ${noteContent} "\n`;
        });

        let notesData = { 'plain': notesText, 'csv': notesCSV };
        download(notesData, format, tabId);
        displayMessage("Downloaded");
    });
}

function downloadAllNotes(format) {
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let data = result.all_notes;
        let notesText = "", notesCSV = `Site / Notes\n`;

        // If data is empty then return
        if (!data || Object.keys(data).length === 0) return;

        // Readable format of notes data
        for (const [hostname, notes] of Object.entries(data)) {
            if (notes && notes.length !== 0) {
                notesText += `Site: ${hostname}\nNotes:\n\n`;
                notesCSV += `Site: ${hostname}\n`;

                notes.forEach((note, index) => {
                    notesText += `${index + 1})\n${note}\n\n`;
                    let noteContent = note.replace(/"/g, '""'); // Replace all " with ""
                    noteContent = noteContent.replace(/\r?\n/g, '\n');
                    notesCSV += `" ${noteContent} "\n`;
                });

                notesText += '\n\n';
                notesCSV += '\n\n';
            }
        }

        let notesData = { 'plain': notesText, 'csv': notesCSV };
        download(notesData, format, 'ALL');
        displayMessage("Downloaded", 3);
    });
}

function download(notesData, format, fileName) {
    let extension = { 'plain': 'txt', 'csv': 'csv' };
    let downloadLink = document.createElement("a");
    let notesBlob = new Blob([notesData[format]], { type: `text/${format};charset=utf-8` });

    downloadLink.download = `Notes - ${fileName}.${extension[format]}`;
    downloadLink.href = URL.createObjectURL(notesBlob);

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function deleteAllNotes(tabId) {
    let _confirm = confirm("It will delete all notes of this site, Are you sure?");
    if (!_confirm) return;
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let all_notes = result.all_notes;
        delete all_notes[tabId];
        // Set updated data
        chrome.storage.sync.set({ 'all_notes': all_notes });
    });
    showEmptyNotesMessage();
}

function clearAllData() {
    let _confirm = confirm("It will clear all data, Are you sure?");
    if (!_confirm) return;
    // Set empty object for 'all_notes'
    chrome.storage.sync.set({ 'all_notes': {} });
    displayMessage("Cleared", 2);
    showEmptyNotesMessage();
}

function copyNoteToClipboard(text) {
    // Clipboard API to write text to clipboard
    navigator.clipboard.writeText(text)
        .then(() => {
            displayMessage("Copied");
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
}

function showBadgeText(status) {
    if (status) {
        chrome.action.setBadgeText({ text: "" });
    } else {
        displayMessage("OFF");
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "#ecbfc0" });
    }
}

function toggleSettingSection() {
    if (settingSection.style.display === "block") {
        settingSection.style.display = "none";
        homeSection.style.display = "block";
    } else {
        settingSection.style.display = "block";
        homeSection.style.display = "none";
    }
}

function showEmptyNotesMessage() {
    emptyListMessage.style.display = "block";
    container.style.display = "none";
}

// Fun Elements
messageBox[0].addEventListener('click', () => displayMessage("Hey!"));
function displayMessage(msg, index = 0) {
    let originalMessage = [
        "NoteSnap",
        "Highlighter (Beta)",
        "Clear All Data",
        "Download All Data"
    ];

    messageBox[index].innerHTML = msg;
    // Remove the message element after 2 seconds
    setTimeout(() => {
        messageBox[index].innerHTML = originalMessage[index];
    }, 600);
}