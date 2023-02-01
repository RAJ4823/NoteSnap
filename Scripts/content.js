// Using url's hostname as a key for storing notes
const tabId = window.location.hostname.toString();

// Main - Fires event when user select some text
document.addEventListener("mouseup", function (event) {
    // Get the selected Text and add-note-button if exists
    let selection = window.getSelection();
    let selectedText = selection.toString().trim();
    let previousAddBtn = document.getElementById("add-note-button");

    // If there is no selected text or the add-note-button already exists then return
    if (!selectedText || previousAddBtn) return;

    // Checking main switch and highlight status
    chrome.storage.sync.get({ 'status': true, 'highlight': false }, function (res) {
        // If main switch is on then 
        if (res.status) {
            // display the add-note-button where user's cursor is pointing
            createAddButton(selectedText, event, res.highlight);
        }
    });
});

// Remove add-note-button, If user tries select some other text or press mouse button
document.addEventListener("mousedown", function (e) {
    let addNoteButton = document.getElementById("add-note-button");
    if (addNoteButton && e.target.id !== "add-note-button") {
        addNoteButton.remove();
    }
});

// Removes add-note-button, If user presses some key
document.addEventListener("keydown", function () {
    let addNoteButton = document.getElementById("add-note-button");
    if (addNoteButton) {
        addNoteButton.remove();
    }
});

// Creating add-note-button and adding it's click event listener
function createAddButton(selectedText, event, highlight) {
    let addBtn = document.createElement("button");
    addBtn.id = "add-note-button";

    // If user clicks the button then update the notes
    addBtn.addEventListener("click", function () {
        // If user turned on the highlight feature then highlight the selected text
        if (highlight) highlightText();
        // add selected text to the notes of current tabId
        updateNotes(selectedText, tabId);
        // Remove button after notes are updated
        addBtn.remove();
    });

    // Get the position of the selected text for button's position
    let x = event.pageX;
    let y = event.pageY;
    // Set button's Position
    addBtn.style.left = x + "px";
    addBtn.style.top = y + "px";
    // Add the button to the document
    document.body.appendChild(addBtn);
}

// adding or updating notes 
function updateNotes(selectedText, tabId) {
    // Get all_notes from the storage
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let all_notes = result.all_notes;
        // Select notes for the current tabId
        let notes = all_notes[tabId] || [];
        // If selectedText is not exists in the notes then
        if (notes.indexOf(selectedText) === -1) {
            // Push selected text to the notes
            notes.push(selectedText);
            // And update all_notes
            all_notes[tabId] = notes;
            // Set updated all_notes to the storage
            chrome.storage.sync.set({ all_notes: all_notes });
        }
    });

    // Remove selection after updating the notes
    window.getSelection().removeAllRanges();
}

// For highlighting text
function highlightText() {
    // Highligher CSS
    var span = document.createElement("span");
    span.style.fontWeight = "bold";
    span.style.backgroundColor = "YELLOW";
    span.style.color = "BLACK";

    if (window.getSelection) {
        var sel = window.getSelection();
        // Try to surround the selected content by highlighter element
        try {
            let range = sel.getRangeAt(0).cloneRange();
            range.surroundContents(span);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        catch {
            console.log("Cannot highlight the text");
        }
    }
}