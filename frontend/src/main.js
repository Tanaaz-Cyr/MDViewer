import './style.css';
import './app.css';
import { 
    OpenFileDialog, 
    SaveFileDialog, 
    ReadFile, 
    GetContent,
    SpeakLine,
    Stop, 
    IsSpeaking,
    GetAvailableVoices 
} from '../wailsjs/go/main/App';

// State
let currentFile = null;
let content = '';
let isSpeaking = false;
let selectedLineIndex = 0;
let currentLines = [];
let shouldStopSpeaking = false;

// Elements
const tabs = document.querySelectorAll('.tab');
const editorContent = document.getElementById('editorContent');
const viewerContent = document.getElementById('viewerContent');
const viewerToolbar = document.getElementById('viewerToolbar');
const editor = document.getElementById('editor');
const lineNumbers = document.getElementById('lineNumbers');
const viewer = document.getElementById('viewer');
const openBtn = document.getElementById('openBtn');
const saveBtn = document.getElementById('saveBtn');
const speakBtn = document.getElementById('speakBtn');
const stopBtn = document.getElementById('stopBtn');
const voiceSelect = document.getElementById('voiceSelect');
const rateSlider = document.getElementById('rateSlider');
const rateValue = document.getElementById('rateValue');
const filePathEl = document.getElementById('filePath');
const wordCountEl = document.getElementById('wordCount');
const readingStatusEl = document.getElementById('readingStatus');
const loadingIndicator = document.getElementById('loadingIndicator');

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tabName === 'editor') {
            editorContent.classList.add('active');
            viewerContent.classList.remove('active');
            viewerToolbar.style.display = 'none';
        } else {
            editorContent.classList.remove('active');
            viewerContent.classList.add('active');
            viewerToolbar.style.display = 'flex';
            
            // Update viewer with current editor content
            content = editor.value;
            renderMarkdown(content);
        }
    });
});

// File operations using native dialogs
openBtn.addEventListener('click', async () => {
    try {
        const filePath = await OpenFileDialog();
        if (!filePath) return;
        
        const fileContent = await ReadFile(filePath);
        currentFile = filePath;
        content = fileContent;
        
        editor.value = fileContent;
        updateLineNumbers();
        saveBtn.disabled = false;
        
        renderMarkdown(fileContent);
        
        const fileName = filePath.split('/').pop();
        filePathEl.textContent = filePath;
        wordCountEl.textContent = `${countWords(fileContent)} words`;
        speakBtn.disabled = false;
    } catch (err) {
        console.error('Error opening file:', err);
        alert('Error opening file: ' + err);
    }
});

saveBtn.addEventListener('click', async () => {
    try {
        const contentToSave = editor.value;
        const savedPath = await SaveFileDialog(contentToSave);
        
        if (savedPath) {
            currentFile = savedPath;
            content = contentToSave;
            const fileName = savedPath.split('/').pop();
            filePathEl.textContent = savedPath;
            alert('File saved successfully!');
        }
    } catch (err) {
        console.error('Error saving file:', err);
        alert('Error saving file: ' + err);
    }
});

// Editor line numbers
function updateLineNumbers() {
    const lineCount = editor.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lineCount; i++) {
        numbers += i + '\n';
    }
    lineNumbers.textContent = numbers;
}

editor.addEventListener('input', () => {
    updateLineNumbers();
    const text = editor.value;
    wordCountEl.textContent = `${countWords(text)} words`;
    content = text;
});

editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
});

// Word count
function countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Improved Markdown Parser
function renderMarkdown(text) {
    if (!text.trim()) {
        viewer.innerHTML = `
            <div class="no-file">
                <div class="no-file-icon">📄</div>
                <div class="no-file-text">No content</div>
                <div class="no-file-hint">Start typing in the Editor tab or open a file</div>
            </div>
        `;
        return;
    }

    const lines = text.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';
    let inList = false;
    let listType = '';
    let inTable = false;
    let tableHeaders = [];
    let tableRows = [];
    let tableStartLine = -1;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const lineNum = i;
        
        // Code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                html += `<pre data-line="${lineNum}"><code>${escapeHtml(codeContent.trim())}</code></pre>`;
                codeContent = '';
                codeLanguage = '';
                inCodeBlock = false;
            } else {
                codeLanguage = line.slice(3).trim();
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeContent += line + '\n';
            continue;
        }

        // Table detection
        const isTableRow = line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|');
        const isTableSeparator = /^\|[\s\-:|]+\|$/.test(line.trim());
        
        if (isTableRow || isTableSeparator) {
            if (!inTable) {
                // Start of table
                inTable = true;
                tableStartLine = lineNum;
                tableHeaders = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
            } else if (isTableSeparator) {
                // Skip separator line
                continue;
            } else {
                // Table data row
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
                tableRows.push(cells);
            }
            continue;
        } else if (inTable) {
            // End of table - render it
            html += renderTable(tableHeaders, tableRows, tableStartLine);
            inTable = false;
            tableHeaders = [];
            tableRows = [];
            tableStartLine = -1;
        }

        // Headers
        if (line.startsWith('###### ')) {
            html += `<h6 data-line="${lineNum}" class="clickable-line">${processInline(line.slice(7))}</h6>`;
        } else if (line.startsWith('##### ')) {
            html += `<h5 data-line="${lineNum}" class="clickable-line">${processInline(line.slice(6))}</h5>`;
        } else if (line.startsWith('#### ')) {
            html += `<h4 data-line="${lineNum}" class="clickable-line">${processInline(line.slice(5))}</h4>`;
        } else if (line.startsWith('### ')) {
            html += `<h3 data-line="${lineNum}" class="clickable-line">${processInline(line.slice(4))}</h3>`;
        } else if (line.startsWith('## ')) {
            html += `<h2 data-line="${lineNum}" class="clickable-line">${processInline(line.slice(3))}</h2>`;
        } else if (line.startsWith('# ')) {
            html += `<h1 data-line="${lineNum}" class="clickable-line">${processInline(line.slice(2))}</h1>`;
        }
        // Blockquote
        else if (line.startsWith('> ')) {
            html += `<blockquote data-line="${lineNum}" class="clickable-line">${processInline(line.slice(2))}</blockquote>`;
        }
        // Horizontal rule
        else if (line.match(/^[\-\*_]{3,}$/)) {
            html += `<hr data-line="${lineNum}">`;
        }
        // Unordered list
        else if (line.match(/^[\-\*\+] /)) {
            const item = line.slice(2);
            if (!inList || listType !== 'ul') {
                if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
                html += '<ul>';
                inList = true;
                listType = 'ul';
            }
            html += `<li data-line="${lineNum}" class="clickable-line">${processInline(item)}</li>`;
        }
        // Ordered list
        else if (line.match(/^\d+\. /)) {
            const item = line.replace(/^\d+\. /, '');
            if (!inList || listType !== 'ol') {
                if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
                html += '<ol>';
                inList = true;
                listType = 'ol';
            }
            html += `<li data-line="${lineNum}" class="clickable-line">${processInline(item)}</li>`;
        }
        // Empty line
        else if (!line.trim()) {
            if (inList) {
                html += listType === 'ul' ? '</ul>' : '</ol>';
                inList = false;
                listType = '';
            }
        }
        // Paragraph
        else {
            if (inList) {
                html += listType === 'ul' ? '</ul>' : '</ol>';
                inList = false;
                listType = '';
            }
            html += `<p data-line="${lineNum}" class="clickable-line">${processInline(line)}</p>`;
        }
    }

    // Close any open lists
    if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
    }

    // Close any open table
    if (inTable) {
        html += renderTable(tableHeaders, tableRows, tableStartLine);
    }

    viewer.innerHTML = html;

    // Add click listeners to all lines
    attachClickListeners();
}

function renderTable(headers, rows, startLine) {
    let tableHtml = '<table class="md-table" data-line="' + startLine + '">';
    
    // Table header
    if (headers.length > 0) {
        tableHtml += '<thead><tr>';
        headers.forEach(header => {
            tableHtml += `<th>${processInline(header)}</th>`;
        });
        tableHtml += '</tr></thead>';
    }
    
    // Table body
    if (rows.length > 0) {
        tableHtml += '<tbody>';
        rows.forEach(row => {
            tableHtml += '<tr>';
            row.forEach(cell => {
                tableHtml += `<td>${processInline(cell)}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody>';
    }
    
    tableHtml += '</table>';
    return tableHtml;
}

function attachClickListeners() {
    document.querySelectorAll('.clickable-line').forEach(line => {
        line.addEventListener('click', (e) => {
            selectedLineIndex = parseInt(e.currentTarget.dataset.line);
            
            // Remove previous selection
            document.querySelectorAll('.clickable-line.selected').forEach(l => l.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            
            console.log('Selected line:', selectedLineIndex);
        });
    });
}

function processInline(text) {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    // Links
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    return text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// TTS Functions
speakBtn.addEventListener('click', async () => {
    if (isSpeaking) return;
    
    if (!content) {
        alert('Please open a file first');
        return;
    }

    try {
        isSpeaking = true;
        shouldStopSpeaking = false;
        speakBtn.disabled = true;
        stopBtn.disabled = false;
        loadingIndicator.classList.add('active');
        readingStatusEl.textContent = 'Reading...';

        const voice = voiceSelect.value;
        const rate = parseInt(rateSlider.value);
        
        // Get all lines from content
        currentLines = content.split('\n');
        
        // Start speaking from selected line
        await speakLinesSequentially(selectedLineIndex, voice, rate);
        
    } catch (err) {
        console.error('TTS Error:', err);
        alert('TTS Error: ' + err);
    } finally {
        stopSpeaking();
    }
});

stopBtn.addEventListener('click', async () => {
    shouldStopSpeaking = true;
    try {
        await Stop();
    } catch (err) {
        console.error('Stop Error:', err);
    }
    stopSpeaking();
});

async function speakLinesSequentially(startLine, voice, rate) {
    for (let i = startLine; i < currentLines.length; i++) {
        // Check if we should stop
        if (shouldStopSpeaking) {
            console.log('Stopping speech at line', i);
            break;
        }
        
        let line = currentLines[i];
        
        // Skip empty lines
        if (!line.trim()) {
            continue;
        }
        
        // Clean markdown syntax before speaking
        const originalLine = line;
        line = cleanMarkdownForSpeech(line);
        
        // Debug: Log what we're processing
        if (originalLine.startsWith('-') || originalLine.startsWith('*') || originalLine.startsWith('+')) {
            console.log('Bullet point detected:');
            console.log('  Original:', originalLine);
            console.log('  Cleaned:', line);
        }
        
        // Skip if nothing left after cleaning
        if (!line.trim()) {
            console.log('  Skipping (empty after cleaning)');
            continue;
        }
        
        // Highlight current line
        highlightLine(i);
        
        // Update status
        readingStatusEl.textContent = `Reading line ${i + 1} of ${currentLines.length}...`;
        
        try {
            // Speak this line and wait for it to complete
            await SpeakLine(line, voice || '', rate);
        } catch (err) {
            console.error('Error speaking line', i, ':', err);
            // Check if it was intentionally stopped
            if (shouldStopSpeaking) {
                break;
            }
            // Otherwise continue to next line
        }
        
        // Check again after speaking (in case stop was pressed during speech)
        if (shouldStopSpeaking) {
            break;
        }
        
        // Small pause between lines (backend already has 500ms delay after audio)
        await sleep(100);
    }
}

function cleanMarkdownForSpeech(text) {
    // Remove markdown formatting for TTS
    let cleaned = text;
    
    // Remove headers (# ## ### etc)
    cleaned = cleaned.replace(/^#{1,6}\s+/, '');
    
    // Remove bullet points (- * +) including indented ones
    cleaned = cleaned.replace(/^\s*[\-\*\+]\s+/, '');
    
    // Remove numbered lists (1. 2. etc) including indented ones
    cleaned = cleaned.replace(/^\s*\d+\.\s+/, '');
    
    // Remove blockquote markers (>)
    cleaned = cleaned.replace(/^>\s+/, '');
    
    // Remove bold/italic markers but keep the text
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
    cleaned = cleaned.replace(/__(.+?)__/g, '$1');
    cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
    cleaned = cleaned.replace(/_(.+?)_/g, '$1');
    
    // Remove inline code markers
    cleaned = cleaned.replace(/`(.+?)`/g, '$1');
    
    // Remove links but keep the text
    cleaned = cleaned.replace(/\[(.+?)\]\((.+?)\)/g, '$1');
    
    // Remove table separators (|---|---|)
    if (cleaned.match(/^\|[\s\-:|]+\|$/)) {
        return '';
    }
    
    // Clean up table cell separators for better reading
    if (cleaned.includes('|')) {
        cleaned = cleaned.replace(/\|/g, ', ').replace(/,\s*,/g, ',');
        cleaned = cleaned.replace(/^,\s*/, '').replace(/,\s*$/, '');
    }
    
    return cleaned.trim();
}

function stopSpeaking() {
    isSpeaking = false;
    shouldStopSpeaking = true;
    speakBtn.disabled = false;
    stopBtn.disabled = true;
    loadingIndicator.classList.remove('active');
    readingStatusEl.textContent = '';
    clearHighlight();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function highlightLine(lineNum) {
    clearHighlight();
    const elements = document.querySelectorAll(`[data-line="${lineNum}"]`);
    elements.forEach(el => {
        el.classList.add('line-reading');
        // Scroll the highlighted line into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function clearHighlight() {
    document.querySelectorAll('.line-reading').forEach(el => {
        el.classList.remove('line-reading');
    });
}

// Voice selection
async function loadVoices() {
    try {
        const voices = await GetAvailableVoices();
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice;
            option.textContent = voice;
            voiceSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading voices:', err);
    }
}

// Speech rate slider
if (rateSlider && rateValue) {
    rateSlider.addEventListener('input', (e) => {
        rateValue.textContent = e.target.value;
    });
}

// Initialize
updateLineNumbers();
loadVoices();

// Show welcome message
viewer.innerHTML = `
    <div class="no-file">
        <div class="no-file-icon">📄</div>
        <div class="no-file-text">Welcome to MDViewer</div>
        <div class="no-file-hint">Click "Open" to load a markdown file</div>
    </div>
`;
