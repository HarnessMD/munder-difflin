# Agent Stage app icon

`agent-stage.png` is the generated master: three terminal agents on an amber
stage, with teal screens and a dark pixel silhouette. It was created using the
built-in image generation tool for this project.

The main window uses the PNG in development and loads its packaged copy from
the resources directory. Electron Builder uses `agent-stage.ico` on Windows,
`agent-stage.icns` on macOS, and the PNG on Linux. Restart the development app
to load the new window icon; executable and installer icons require repackaging.

Regenerate the icon containers on Windows after replacing the master:

```powershell
powershell -File tools/export-agent-stage-icon.ps1
```

Generation prompt: A polished desktop app icon for Agent Stage, where teams of
coding agents collaborate on a pixel office stage. Three terminal monitors on
a stepped stage, central monitor taller, cream terminal chevrons, dark navy
tile with stepped corners, amber stage, teal screens. Chunky SNES aesthetic,
strong silhouette, square composition, transparent exterior, no lettering.
