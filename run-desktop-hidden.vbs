Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & Replace(WScript.ScriptFullName, WScript.ScriptName, "") & "run-desktop.bat""", 0, False
