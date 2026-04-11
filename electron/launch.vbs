Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Resolve project root dynamically (parent of the electron\ folder this script lives in)
strScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
strProjectDir = FSO.GetParentFolderName(strScriptDir)

WshShell.CurrentDirectory = strProjectDir
WshShell.Run "cmd /c npx electron .", 0, False
