// Using url's hostname as a key for storing notes
const tabId = window.location.hostname.toString();

// Main - Fires event when user select some text
document.addEventListener("mouseup", function (event) {
    let selection = window.getSelection();
    let selectedText = selection.toString().trim();
    let previousAddBtn = document.getElementById("add-note-button");

    // If there is no selected text or add-note-button already exists then return
    if (!selectedText || previousAddBtn) return;

    // Checking switch and highlight status
    chrome.storage.sync.get({ 'status': true, 'highlight': false }, function (res) {
        if (res.status) {
            // add the button where user's cursor is pointing
            createAddButton(selectedText, event, res.highlight);
        }
    });
});

// Remove add-note-button, If user selects some other text or press mouse button
document.addEventListener("mousedown", function (e) {
    let addNoteButton = document.getElementById("add-note-button");
    if (addNoteButton && e.target.id !== "add-note-button") {
        addNoteButton.remove();
    }
});

// Removes add-note-button, If user press some key
document.addEventListener("keydown", function () {
    let addNoteButton = document.getElementById("add-note-button");
    if (addNoteButton) {
        addNoteButton.remove();
    }
});

// Updating notes 
function updateNotes(selectedText, tabId) {
    // Get all_notes from the storage
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let all_notes = result.all_notes;
        let notes = all_notes[tabId] || [];
        if (notes.indexOf(selectedText) === -1) {
            // Push unique text to the all_notes[tabId] 
            notes.push(selectedText);
            all_notes[tabId] = notes;
            // Set updated notes to the storage
            chrome.storage.sync.set({ all_notes: all_notes });
        }
    });
    // Remove selection after clicking add-note-button
    window.getSelection().removeAllRanges();
}

// Floating add-to-note button when user select some text
function createAddButton(selectedText, event, highlight) {
    let addBtn = document.createElement("button");
    addBtn.id = "add-note-button";
    addBtn.addEventListener("click", function () {
        if (highlight) highlightText();
        updateNotes(selectedText, tabId);
        // Remove addBtn after notes are updated
        addBtn.remove();
    });

    // Get the position of the selected text
    let x = event.pageX;
    let y = event.pageY;
    // Position the button next to the selected text
    addBtn.style.left = x + "px";
    addBtn.style.top = y + "px";
    // Add the button to the document
    document.body.appendChild(addBtn);
    return addBtn;
}

// Highlighting text
function highlightText() {
    var span = document.createElement("span");
    span.style.fontWeight = "bold";
    span.style.backgroundColor = "YELLOW";
    span.style.color = "BLACK";
    if (window.getSelection) {
        var sel = window.getSelection();
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