// Using url's hostname as a key for storing notes
const tabId = window.location.hostname.toString();

// Main - Fires event when user select some text
document.addEventListener("mouseup", function (event) {
    let selection = window.getSelection();
    let selectedText = selection.toString().trim();
    let addNoteButton = document.getElementById("add-note-button");

    // If there is no selected text then return
    if (!selectedText) {
        if (addNoteButton) addNoteButton.remove();
        return;
    }

    // Checking switch status
    chrome.storage.sync.get({ 'status': true }, function (res) {
        if (res.status && !addNoteButton) {
            // add the button where user's cursor is pointing
            addButton(selectedText, event);
        }
    });
});

function addButton(selectedText, event) {
    let addBtn = createAddButton(event);
    // add/update the notes when user click this button
    addBtn.addEventListener("click", function () {
        updateNotes(selectedText, tabId);
        addBtn.remove();    // Remove addBtn after notes are updated
    });
    // Add the button to the document
    document.body.appendChild(addBtn);
    // Removes add-note-button, If user press some key
    document.addEventListener("keydown", () => addBtn.remove());
}

// Updating notes 
function updateNotes(selectedText, tabId) {
    chrome.storage.sync.get({ 'all_notes': {} }, function (result) {
        let all_notes = result.all_notes;
        let notes = all_notes[tabId] || [];
        if (notes.indexOf(selectedText) === -1) {
            notes.push(selectedText);
            all_notes[tabId] = notes;
            chrome.storage.sync.set({ all_notes: all_notes });
        }
    });
    // Remove selection after clicking add-note-button
    window.getSelection().removeAllRanges();
}

// Floating add-to-note button when user select some text
function createAddButton(event) {
    let addNoteButton = document.createElement("button");
    addNoteButton.id = "add-note-button";
    // Get the position of the selected text
    let x = event.pageX;
    let y = event.pageY;
    // Position the button next to the selected text
    addNoteButton.style.left = x + "px";
    addNoteButton.style.top = y + "px";
    return addNoteButton;
}
