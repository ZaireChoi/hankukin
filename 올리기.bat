@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "LOG=%~dp0_업로드-결과.txt"
echo HANKUKIN upload log > "%LOG%"
echo %date% %time% >> "%LOG%"

echo ============================================================
echo  HANKUKIN - GitHub 업로드
echo ------------------------------------------------------------
echo  대상: https://github.com/ZaireChoi/hankukin
echo  폴더: %cd%
echo ============================================================
echo.

REM ---------- git 실행파일 찾기 ----------
set "GIT="

where git >nul 2>&1
if not errorlevel 1 set "GIT=git"

if not defined GIT if exist "%ProgramFiles%\Git\cmd\git.exe" set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if not defined GIT if exist "%ProgramFiles%\Git\bin\git.exe" set "GIT=%ProgramFiles%\Git\bin\git.exe"
if not defined GIT if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" set "GIT=%ProgramFiles(x86)%\Git\cmd\git.exe"
if not defined GIT if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"

REM GitHub Desktop 내장 git
if not defined GIT (
  for /f "delims=" %%D in ('dir /b /ad /o-n "%LOCALAPPDATA%\GitHubDesktop\app-*" 2^>nul') do (
    if not defined GIT if exist "%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git\cmd\git.exe" (
      set "GIT=%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git\cmd\git.exe"
    )
    if not defined GIT if exist "%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git\mingw64\bin\git.exe" (
      set "GIT=%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git\mingw64\bin\git.exe"
    )
  )
)

if not defined GIT (
  echo [실패] git 실행파일을 찾지 못했습니다.
  echo [FAIL] git not found >> "%LOG%"
  echo --- 탐색한 경로 --- >> "%LOG%"
  echo %ProgramFiles%\Git\cmd\git.exe >> "%LOG%"
  echo %LOCALAPPDATA%\GitHubDesktop\ >> "%LOG%"
  dir /b /ad "%LOCALAPPDATA%\GitHubDesktop" >> "%LOG%" 2>&1
  dir /b /ad "%ProgramFiles%\Git" >> "%LOG%" 2>&1
  echo.
  echo  _업로드-결과.txt 파일이 만들어졌습니다. 클로드에게 알려주세요.
  echo.
  pause
  exit /b 1
)

echo  git 위치: !GIT!
echo GIT=!GIT! >> "%LOG%"
echo.

echo [1/5] 저장소 초기화
"!GIT!" init -b main               >> "%LOG%" 2>&1

echo [2/5] 파일 추가
"!GIT!" add -A                     >> "%LOG%" 2>&1

echo [3/5] 커밋
"!GIT!" -c user.name="ZaireChoi" -c user.email="suyol1974@gmail.com" commit -m "HANKUKIN Phase 1 MVP scaffold" >> "%LOG%" 2>&1

echo [4/5] 원격 연결
"!GIT!" remote remove origin       >> "%LOG%" 2>&1
"!GIT!" remote add origin https://github.com/ZaireChoi/hankukin.git >> "%LOG%" 2>&1

echo [5/5] 업로드 (로그인 창이 뜨면 승인해 주세요)
"!GIT!" push -u origin main --force >> "%LOG%" 2>&1
set RC=%errorlevel%

echo. >> "%LOG%"
echo EXITCODE=%RC% >> "%LOG%"
"!GIT!" log --oneline -n 3         >> "%LOG%" 2>&1

echo.
if "%RC%"=="0" (
  echo ============================================================
  echo  성공했습니다.
  echo  https://github.com/ZaireChoi/hankukin 새로고침해 보세요.
  echo ============================================================
) else (
  echo ============================================================
  echo  업로드 실패. _업로드-결과.txt 가 만들어졌습니다.
  echo  클로드에게 "결과 파일 확인해줘" 라고 말씀해 주세요.
  echo ============================================================
)
echo.
echo  이 창은 아무 키나 누르면 닫힙니다.
pause
endlocal
