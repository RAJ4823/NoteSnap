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

// Setting status of highlighter toggle
highlighterSwitch.addEventListener("change", function () {
    let switchStatus = highlighterSwitch.checked;
    chrome.storage.sync.set({ 'highlight': switchStatus });
    let message = (switchStatus) ? "ON" : "OFF";
    displayMessage("Highlighter - " + message, 1);
});

// Getting previous value of switches/toggle and updating it
chrome.storage.sync.get({ 'status': true, 'highlight': false }, function (res) {
    mainSwitch.checked = res.status;
    highlighterSwitch.checked = res.highlight;
    showBadgeText(mainSwitch.checked);
})

//? Home section's functionality for current tab
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // TabID = hostname of the current website, which is used for storing the notes
    let url = new URL(tabs[0].url);
    let tabId = url.hostname.toString();

    // Get the all_notes from storage
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let all_notes = result.all_notes;
        // Display all notes of current site
        showNotes(all_notes, tabId);
    });

    // For downloading or deleting all notes of current site
    downloadNotesAsTextButton.addEventListener("click", () => downloadNotes(tabId, 'plain'));
    downloadNotesAsCSVButton.addEventListener("click", () => downloadNotes(tabId, 'csv'));
    deleteAllButton.addEventListener("click", () => deleteAllNotes(tabId));
});

//? Setting Page's functionality (for all data)
// For downloading or deleting notes of all sites
downloadAllNotesAsTextButton.addEventListener("click", () => downloadAllNotes('plain'));
downloadAllNotesAsCSVButton.addEventListener("click", () => downloadAllNotes('csv'));
clearAllDataButton.addEventListener("click", () => clearAllData());


// For showing notes of current site
function showNotes(all_notes, tabId) {
    // Get the notes for current site
    let notes = all_notes[tabId] || [];

    // If notes are empty then display empty msg and return
    if (!notes || notes.length === 0) {
        showEmptyNotesMessage();
        return;
    }

    // Create notediv element for each notes and display it by **recent added order**
    for (let index = notes.length - 1; index >= 0; --index) {
        let note = notes[index];                            // Current Note
        let noteDiv = document.createElement("div");        // Note Block
        let noteText = document.createElement("p");         // Note-text content block
        let deleteBtn = document.createElement("button");   // Note-delete button

        // Setting styling and relevant values
        noteDiv.classList.add("note");
        deleteBtn.classList.add("delete-note-button");
        deleteBtn.innerHTML = '<i class="fa-regular fa-square-minus"></i>';
        deleteBtn.title = "Delete";
        noteText.innerText = note;

        // for deleting the individual note when user clicks on delete note button/icon
        deleteBtn.addEventListener("click", function () {
            notes.splice(index, 1);
            all_notes[tabId] = notes;
            chrome.storage.sync.set({ 'all_notes': all_notes });
            displayMessage("Deleted");

            // After deleting a note, display all notes again **(for maintaining proper indices)**
            noteList.innerHTML = "";
            showNotes(all_notes, tabId);
        });

        // Copy the note to clopboard when user clicks on the note content
        noteText.addEventListener('click', (e) => copyNoteToClipboard(e.target.innerText));

        // appending note-text and delete-button to the note-div and note-div to the note-list
        noteDiv.appendChild(noteText);
        noteDiv.appendChild(deleteBtn);
        noteList.appendChild(noteDiv);
    };
}

// For downloading notes of current site
function downloadNotes(tabId, format) {
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        // Get the notes for current site
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

        // Downloading notesData
        let notesData = { 'plain': notesText, 'csv': notesCSV };
        download(notesData, format, tabId);
        displayMessage("Downloaded");
    });
}

// For downloading notes of all site
function downloadAllNotes(format) {
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        // Get the notes of all sites
        let data = result.all_notes;
        let notesText = "", notesCSV = `Site / Notes\n`;

        // If data is empty then return
        if (!data || Object.keys(data).length === 0) return;

        // Making readable format of all notes data
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

        // Downloading notesData
        let notesData = { 'plain': notesText, 'csv': notesCSV };
        download(notesData, format, 'ALL');
        displayMessage("Downloaded", 3);
    });
}

// Common download function for downloading notes-data with given format and tabId as fileName
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

// for deleting all notes of current site
function deleteAllNotes(tabId) {
    // Get confirmation from the user
    let _confirm = confirm("It will delete all notes of this site, Are you sure?");
    if (!_confirm) return;
    // Get all_notes from the storage and delete the current site's notes
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let all_notes = result.all_notes;
        delete all_notes[tabId];
        // Set updated data
        chrome.storage.sync.set({ 'all_notes': all_notes });
    });
    showEmptyNotesMessage();
}

// for deleting all data/notes
function clearAllData() {
    // Get confirmation from the user
    let _confirm = confirm("It will clear all data, Are you sure?");
    if (!_confirm) return;
    // Set empty object for 'all_notes'
    chrome.storage.sync.set({ 'all_notes': {} });
    displayMessage("Cleared", 2);
    showEmptyNotesMessage();
}

// for copying current note to clipboard
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

// for showing badge text as extension's status
function showBadgeText(status) {
    if (status) {
        chrome.action.setBadgeText({ text: "" });
    } else {
        // Show "OFF" when main switch is turned off
        displayMessage("OFF");
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "#ecbfc0" });
    }
}

// for toggling between home and setting section
function toggleSettingSection() {
    if (settingSection.style.display === "block") {
        settingSection.style.display = "none";
        homeSection.style.display = "block";
    } else {
        settingSection.style.display = "block";
        homeSection.style.display = "none";
    }
}

// for showing empty notes message
function showEmptyNotesMessage() {
    emptyListMessage.style.display = "block";
    container.style.display = "none";
}

// Fun Elements for showing different messages when some event occures
messageBox[0].addEventListener('click', () => displayMessage("Hey!"));
function displayMessage(msg, index = 0) {
    let originalMessage = [
        "NoteSnap",
        "Highlighter (Beta)",
        "Clear All Data",
        "Download All Data"
    ];

    messageBox[index].innerHTML = msg;
    // Remove the message element after 0.6 seconds
    setTimeout(() => {
        messageBox[index].innerHTML = originalMessage[index];
    }, 600);
}