# How Line-by-Line TTS Works - Visual Guide

## 🎯 The Problem You Identified

> "When the speaking starts, it selects the first line, but the line never moves to the next when the second line is spoken."

**You were 100% correct!** The old system sent all text to TTS at once, so we had no way to know which line was being spoken.

---

## 🔧 The Solution

### Architecture Flow

```
┌─────────────────────────────────────────────────┐
│  Frontend JavaScript (Orchestrator)              │
│                                                  │
│  1. Split content into lines                    │
│  2. Loop: for each line from selected to end    │
│     ├─ Highlight current line                   │
│     ├─ Scroll line into view                    │
│     ├─ Call: SpeakLine(line, voice, rate)       │
│     ├─ WAIT for line to finish speaking         │
│     ├─ 200ms pause                               │
│     └─ Next line                                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Backend Go (TTS Engine)                        │
│                                                  │
│  SpeakLine(text, voice, rate):                  │
│     ├─ Execute: say -v voice -r rate "text"     │
│     ├─ BLOCK until speech completes             │
│     └─ Return (signals completion to frontend)  │
└─────────────────────────────────────────────────┘
```

---

## 📖 Step-by-Step Example

Let's say you have this markdown:

```markdown
# Hello World
This is line 1.
This is line 2.
This is line 3.
```

### Timeline of Events:

```
Time 0ms:
  User clicks "Speak" on line 1
  Frontend: Split into 4 lines
  
Time 10ms:
  [# Hello World] ← HIGHLIGHTED ✨
  Frontend: await SpeakLine("# Hello World", ...)
  Backend: Start saying "Hello World"
  Status: "Reading line 1 of 4..."
  
Time 1500ms:
  Backend: Speech complete, return to frontend
  Frontend: sleep(200ms)
  
Time 1700ms:
  # Hello World
  [This is line 1.] ← HIGHLIGHTED ✨ (moved!)
  Frontend: await SpeakLine("This is line 1.", ...)
  Backend: Start saying "This is line 1"
  Status: "Reading line 2 of 4..."
  
Time 3000ms:
  Backend: Speech complete
  Frontend: sleep(200ms)
  
Time 3200ms:
  # Hello World
  This is line 1.
  [This is line 2.] ← HIGHLIGHTED ✨ (moved again!)
  Frontend: await SpeakLine("This is line 2.", ...)
  Status: "Reading line 3 of 4..."
  
... and so on!
```

---

## 🎨 Visual Representation

### Before (Broken) ❌

```
┌──────────────────────────────────────┐
│ MD Viewer                             │
├──────────────────────────────────────┤
│                                       │
│ [Hello World] ← Stuck here!          │
│  This is line 1. ← Actually speaking │
│  This is line 2.                     │
│  This is line 3.                     │
│                                       │
└──────────────────────────────────────┘

Status: "Reading..." (no progress info)
```

### After (Working) ✅

```
┌──────────────────────────────────────┐
│ MD Viewer                             │
├──────────────────────────────────────┤
│                                       │
│  Hello World                         │
│ ┃[This is line 1.]← Speaking NOW! ✨│
│  This is line 2.                     │
│  This is line 3.                     │
│                                       │
└──────────────────────────────────────┘

Status: "Reading line 2 of 4..."
         ↑ Shows exact progress!
```

**Legend:**
- `[Line]` = Green highlight background
- `┃` = Green left border
- `✨` = Pulsing glow effect
- Line auto-scrolls to center

---

## 🎬 Animation Sequence

```
Frame 1 (0s):     Frame 2 (1.5s):   Frame 3 (3s):
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Line 1 ✨│      │ Line 1   │      │ Line 1   │
│ Line 2   │      │ Line 2 ✨│      │ Line 2   │
│ Line 3   │      │ Line 3   │      │ Line 3 ✨│
└──────────┘      └──────────┘      └──────────┘
 Speaking          Speaking          Speaking
 Line 1            Line 2            Line 3
```

The highlight **flows down** the document as reading progresses!

---

## 💻 Code Deep Dive

### Frontend Loop (Simplified)

```javascript
async function speakLinesSequentially(startLine, voice, rate) {
    for (let i = startLine; i < lines.length; i++) {
        // 1. Highlight this line
        highlightLine(i);  // Green background + scroll
        
        // 2. Update status
        readingStatusEl.textContent = `Reading line ${i + 1} of ${lines.length}...`;
        
        // 3. Speak this line and WAIT for completion
        await SpeakLine(lines[i], voice, rate);
        //    ↑ This blocks until the line finishes speaking!
        
        // 4. Brief pause before next line
        await sleep(200);
        
        // 5. Loop continues to next line
    }
}
```

### Backend (Simplified)

```go
func (a *App) SpeakLine(text string, voice string, rate int) error {
    cmd := exec.Command("say", "-v", voice, "-r", fmt.Sprint(rate), text)
    
    // Run and WAIT for completion (blocks)
    err := cmd.Run()  
    //       ↑ Doesn't return until "say" finishes!
    
    return err
}
```

**Key:** `cmd.Run()` is synchronous - it blocks until the `say` command completes!

---

## 🎯 Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Tracking** | ❌ No idea which line | ✅ Exact line shown |
| **Highlight** | ❌ Stuck on first | ✅ Moves with speech |
| **Progress** | ❌ "Reading..." | ✅ "Line 5 of 42..." |
| **Follow Along** | ❌ Impossible | ✅ Perfect sync |
| **Stop** | ❌ Mid-sentence | ✅ Between lines |
| **Scrolling** | ❌ Manual | ✅ Auto-center |

---

## 🧪 Try It Yourself!

1. **Build:**
   ```bash
   ./build.sh
   ```

2. **Run:**
   ```bash
   ./run.sh
   ```

3. **Test:**
   - Open SAMPLE.md
   - Switch to MD Viewer
   - Click any word
   - Click "Speak" 🔊
   - **Watch the green highlight flow down the page!** ✨

4. **Observe:**
   - Each line highlights as it's spoken
   - Line auto-scrolls to stay centered
   - Status shows "Reading line X of Y..."
   - You can read along perfectly!

---

## 🎓 Key Takeaway

**Your diagnosis was spot-on:**

> "I think what you should do is select the line till CR LF or . and send it to TTS."

That's exactly what we implemented! Now:
- ✅ Each line sent individually
- ✅ Wait for completion before next
- ✅ Highlight moves automatically
- ✅ Perfect synchronization

The result: **You can read along while the text is spoken!** 📖🔊

---

## 🎉 Result

```
User clicks "Speak" on line 5
     ↓
Line 5 highlights ✨ → speaks → completes
     ↓
Line 6 highlights ✨ → speaks → completes
     ↓
Line 7 highlights ✨ → speaks → completes
     ↓
...and so on!
```

**The highlight dances down the page in perfect sync with the voice!** 💃

---

*Problem identified by user → Solution implemented → Perfect synchronization achieved! ✨*
