@echo off
rem HANKUKIN setup + push.  ASCII only, CRLF only.
rem
rem 2026-08-17 three bugs found the hard way, all in this one file:
rem   1. Korean text  -> cmd mis-parsed UTF-8 bytes
rem   2. LF endings   -> cmd could not split lines
rem   3. %ProgramFiles(x86)% inside a multi-line for(...) block
rem      -> the ")" in "(x86)" closed the block early and cut the script
rem   So: no parenthesised blocks here at all.  Flat, goto-based.

set "LOG=%~dp0.setup-run.log"
cd /d "%~dp0"

echo ==== HANKUKIN setup run %DATE% %TIME% ==== > "%LOG%"
echo.
echo ============================================================
echo   HANKUKIN  -  full output goes to .setup-run.log
echo ============================================================
echo.

set "NPM="
if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM if exist "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" set "NPM=%LOCALAPPDATA%\Programs\nodejs\npm.cmd"
if not defined NPM if exist "C:\Program Files (x86)\nodejs\npm.cmd" set "NPM=C:\Program Files (x86)\nodejs\npm.cmd"
if not defined NPM for /f "delims=" %%A in ('where npm.cmd 2^>nul') do set "NPM=%%A"

if not defined NPM goto NONPM
goto HAVENPM

:NONPM
echo [X] npm.cmd not found
echo [X] npm.cmd NOT FOUND >> "%LOG%"
echo PATH=%PATH% >> "%LOG%"
goto ENDPAUSE

:HAVENPM
echo [1/4] npm: %NPM%
echo [1/4] NPM=%NPM% >> "%LOG%"
for %%D in ("%NPM%") do set "NODEDIR=%%~dpD"
set "PATH=%NODEDIR%;%PATH%"
call node -v >> "%LOG%" 2>&1
call npm -v >> "%LOG%" 2>&1
echo.

echo [2/4] clean install  -  3 to 5 minutes, screen stays quiet
rem 2026-08-17: a half-installed node_modules made "npm install" exit 0
rem while shiki was still missing its files, so the build failed anyway.
rem npm ci wipes node_modules first, so a broken tree cannot survive.
rem 2026-08-17: rmdir /s failed with "Access is denied" -- this PC runs
rem AppCheck anti-ransomware, and deleting ~250k files at once looks exactly
rem like ransomware to it.  So we RENAME instead: one operation, not 250k.
rem The old tree is left as node_modules_old for the operator to delete later.
if exist "%~dp0node_modules_old" rmdir /s /q "%~dp0node_modules_old" 2>nul
if exist "%~dp0node_modules" ren "%~dp0node_modules" node_modules_old
if exist "%~dp0node_modules" echo [!] rename blocked - node_modules still there >> "%LOG%"
call npm ci --no-fund --no-audit >> "%LOG%" 2>&1
if not "%ERRORLEVEL%"=="0" call npm install --no-fund --no-audit >> "%LOG%" 2>&1
echo [2/4] npm install exit=%ERRORLEVEL% >> "%LOG%"
echo.

echo [3/4] build
call npm run build >> "%LOG%" 2>&1
set "BUILD=%ERRORLEVEL%"
echo [3/4] build exit=%BUILD% >> "%LOG%"
if not "%BUILD%"=="0" goto BUILDFAIL
echo       build OK
echo.

echo [4/4] pushing held commits
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\auto-push.ps1" >> "%LOG%" 2>&1
echo [4/4] auto-push exit=%ERRORLEVEL% >> "%LOG%"
powershell -NoProfile -Command "Get-Content '%~dp0.auto-push.log' -Tail 15" >> "%LOG%" 2>&1
echo.
echo ============================================================
echo   FINISHED - see .setup-run.log
echo ============================================================
goto ENDPAUSE

:BUILDFAIL
echo       BUILD FAILED
echo.
echo ============================================================
echo   .setup-run.log has the reason. Claude will read it.
echo ============================================================
goto ENDPAUSE

:ENDPAUSE
echo.
pause
