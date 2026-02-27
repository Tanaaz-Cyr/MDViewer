package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

// App struct
type App struct {
	ctx         context.Context
	currentFile string
	content     string
	ttsProcess  *exec.Cmd
	ttsMutex    sync.Mutex
	isSpeaking  bool
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// OpenFileDialog opens a native file picker for markdown files
func (a *App) OpenFileDialog() (string, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Markdown File",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files (*.md)",
				Pattern:     "*.md;*.markdown",
			},
			{
				DisplayName: "Text Files (*.txt)",
				Pattern:     "*.txt",
			},
			{
				DisplayName: "All Files (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if filePath == "" {
		return "", nil
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	a.currentFile = filePath
	a.content = string(content)

	return filePath, nil
}

// SaveFileDialog opens a native save dialog
func (a *App) SaveFileDialog(content string) (string, error) {
	defaultFilename := "untitled.md"
	if a.currentFile != "" {
		defaultFilename = filepath.Base(a.currentFile)
	}

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Markdown File",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files (*.md)",
				Pattern:     "*.md",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if filePath == "" {
		return "", nil
	}

	err = os.WriteFile(filePath, []byte(content), 0644)
	if err != nil {
		return "", err
	}

	a.currentFile = filePath
	a.content = content

	return filePath, nil
}

// ReadFile reads a markdown file and returns its content
func (a *App) ReadFile(filepath string) (string, error) {
	content, err := os.ReadFile(filepath)
	if err != nil {
		return "", err
	}
	a.currentFile = filepath
	a.content = string(content)
	return string(content), nil
}

// SaveFile saves content to a file
func (a *App) SaveFile(filepath, content string) error {
	a.currentFile = filepath
	a.content = content
	return os.WriteFile(filepath, []byte(content), 0644)
}

// GetCurrentFile returns the current file path
func (a *App) GetCurrentFile() string {
	return a.currentFile
}

// GetContent returns the current content
func (a *App) GetContent() string {
	return a.content
}

// SpeakLine speaks a single line and waits for completion
func (a *App) SpeakLine(text string, voice string, rate int) error {
	a.ttsMutex.Lock()

	// Check if empty line
	if strings.TrimSpace(text) == "" {
		a.ttsMutex.Unlock()
		return nil // Skip empty lines silently
	}

	// Create temp file for audio output to ensure complete processing
	tmpFile := fmt.Sprintf("/tmp/mdviewer_tts_%d.aiff", time.Now().UnixNano())

	var cmd *exec.Cmd
	if voice != "" && voice != "default" {
		// Use -o to write to file, then play - ensures complete processing
		cmd = exec.Command("say", "-v", voice, "-r", fmt.Sprintf("%d", rate), "-o", tmpFile, "--file-format=AIFF", text)
	} else {
		cmd = exec.Command("say", "-r", fmt.Sprintf("%d", rate), "-o", tmpFile, "--file-format=AIFF", text)
	}

	a.ttsProcess = cmd
	a.isSpeaking = true

	// Unlock before blocking operation
	a.ttsMutex.Unlock()

	// Run and wait for file creation
	err := cmd.Run()
	
	if err != nil {
		a.ttsMutex.Lock()
		a.isSpeaking = false
		a.ttsProcess = nil
		a.ttsMutex.Unlock()
		return err
	}

	// Now play the complete audio file
	playCmd := exec.Command("afplay", tmpFile)
	err = playCmd.Run()

	// Clean up temp file
	os.Remove(tmpFile)

	// Re-lock to update state
	a.ttsMutex.Lock()
	a.isSpeaking = false
	a.ttsProcess = nil
	a.ttsMutex.Unlock()

	return err
}

// Stop stops the current TTS
func (a *App) Stop() error {
	a.ttsMutex.Lock()
	defer a.ttsMutex.Unlock()

	if a.ttsProcess != nil {
		// Kill the say process
		exec.Command("pkill", "-f", "say").Run()
		a.ttsProcess = nil
		a.isSpeaking = false
	}
	return nil
}

// IsSpeaking returns whether TTS is currently active
func (a *App) IsSpeaking() bool {
	a.ttsMutex.Lock()
	defer a.ttsMutex.Unlock()
	return a.isSpeaking
}

// GetAvailableVoices returns list of available TTS voices
func (a *App) GetAvailableVoices() ([]string, error) {
	cmd := exec.Command("say", "-v", "?")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	voices := []string{}
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				voiceName := parts[0]
				voices = append(voices, voiceName)
			}
		}
	}
	return voices, nil
}

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "MDViewer",
		Width:     1200,
		Height:    800,
		MinWidth:  800,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 30, G: 38, B: 46, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
