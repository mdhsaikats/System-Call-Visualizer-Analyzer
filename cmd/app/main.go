package main

import (
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/widget"
)

func main() {
	println("App starting...")

	a := app.New()
	w := a.NewWindow("Hello")

	w.SetContent(widget.NewButton(
		"Click me",
		func() { println("Hello!") },
	))

	println("Showing window...")
	w.ShowAndRun()

	println("App closed")
}
