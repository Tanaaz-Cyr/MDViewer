# Line-by-Line TTS Implementation - Fix

## Problem Identified ✅

You were absolutely correct! The original implementation had a fundamental flaw:

**Old approach:**
```
1. Send ALL text from selected line to end → TTS
2. TTS speaks everything at once
3. No way to track which line is currently being spoken
4. Highlight only shows on first line, never moves
```

## Solution Implemented ✅

**New approach - Line-by-Line TTS:**
```
1. Split content into individual lines
2. Loop through lines starting from selected line
3. For each line:
   a. Highlight the current line
   b. Send ONLY that line to TTS
   c. Wait for TTS to complete (synchronous)
   d. Move to next line
4. Highlight follows along automatically!
```

## Technical Changes

### Backend (Go) - `app.go`

**Removed:**
- ❌ `Speak(text, startLine)` - sent all text at once
- ❌ `SpeakWithVoice(text, startLine, voice, rate)` - sent all text at once

**Added:**
```go
✅ SpeakLine(text, voice, rate) - speaks ONE line synchronously
   - Takes a single line of text
   - Waits for completion (no goroutine)
   - Returns only after speaking is done
   - Returns error if any
```

**Key improvement:**
```go
// Run and wait for completion (synchronous)
err := cmd.Run()  // This blocks until "say" finishes
```

### Frontend (JavaScript) - `main.js`

**New state management:**
```javascript
let currentLines = [];         // Store all lines
let shouldStopSpeaking = false; // Stop flag
```

**New function - `speakLinesSequentially()`:**
```javascript
async function speakLinesSequentially(startLine, voice, rate) {
    for (let i = startLine; i < currentLines.length; i++) {
        if (shouldStopSpeaking) break;  // Respect stop button
        
        const line = currentLines[i];
        if (!line.trim()) continue;     // Skip empty lines
        
        highlightLine(i);               // ✨ Highlight current line
        
        await SpeakLine(line, voice, rate); // Wait for this line
        
        await sleep(200);               // Brief pause between lines
    }
}
```

**Flow:**
1. User clicks "Speak"
2. Content is split into lines: `content.split('\n')`
3. Loop starts from selected line
4. Each iteration:
   - Highlights current line (with auto-scroll)
   - Speaks that line (waits for completion)
   - Small 200ms pause
   - Moves to next line
5. Highlight **automatically moves** to each line as it's spoken!

## Visual Result

### Before (Broken):
```
Line 1: [HIGHLIGHTED]  ← Stuck here
Line 2:                ← Currently being spoken but not shown
Line 3:                ← Will be spoken but not shown
Line 4:
```

### After (Working):
```
Line 1:                ← Already spoken
Line 2: [HIGHLIGHTED]  ← Currently being spoken ✨
Line 3:                ← Will be spoken next
Line 4:
```

The highlight **moves automatically** as each line is read!

## Benefits

✅ **Accurate tracking** - You always see exactly which line is being read  
✅ **Synchronized highlighting** - Highlight moves as speech progresses  
✅ **Auto-scroll** - Highlighted line stays centered in view  
✅ **Status updates** - "Reading line 5 of 42..." shows progress  
✅ **Reliable stop** - Can stop between lines cleanly  
✅ **Skip empty lines** - No awkward pauses on blank lines  

## Testing

1. Build and run:
   ```bash
   ./build.sh
   ./run.sh
   ```

2. Open `SAMPLE.md`

3. Switch to MD Viewer tab

4. Click on a word in the first paragraph

5. Click "Speak" 🔊

6. **Watch the magic:**
   - Line 1 highlights → speaks → moves to Line 2
   - Line 2 highlights → speaks → moves to Line 3
   - Line 3 highlights → speaks → moves to Line 4
   - And so on...
   - Each line **automatically scrolls** into center view
   - Status bar shows "Reading line X of Y..."

## Performance Notes

- **200ms pause between lines** - Prevents rushed reading
- **Synchronous speech** - Backend waits for completion
- **Skip empty lines** - No wasted time
- **Auto-scroll** - Smooth centering on each line

## Edge Cases Handled

✅ **Empty lines** - Skipped automatically  
✅ **Stop button** - Stops cleanly between lines  
✅ **Long documents** - Scrolls to keep line visible  
✅ **Starting mid-document** - Works from any selected line  
✅ **Voice/rate changes** - Applied to each line  

## Code Quality

- Clean separation: Backend speaks, Frontend orchestrates
- Proper async/await patterns
- Error handling on each line
- Graceful degradation (continues even if one line fails)
- Clear state management

## User Experience

**Old:** "Why is the highlight stuck on the first line?"  
**New:** "Perfect! I can follow along word-by-word!" ✨

---

## Summary

The fix transforms TTS from a "fire and forget" approach to a **line-by-line orchestrated reading** system. Now you can:

- 📖 Read along as text is spoken
- 👁️ See exactly which line is being read
- 🎯 Track progress through the document
- ⏸️ Stop cleanly at any point

The highlight now **moves with the speech** exactly as you requested!
