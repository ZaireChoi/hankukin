@echo off
chcp 65001 >nul
title HANKUKIN push (sandbox-verified)
echo.
echo  =============================================
echo   HANKUKIN - push sandbox-verified commits
echo  =============================================
echo.
echo  This PC has no node/npm right now, so auto-push refuses
echo  to verify anything. The Claude sandbox already ran the
echo  full build (51 pages, all 7 gates) at the commit recorded
echo  in data\verified-head.txt.
echo.
echo  This pushes exactly UP TO that verified commit.
echo  Anything committed after it stays local and unpushed.
echo.

cd /d "%~dp0"
set /p VERIFIED=<data\verified-head.txt

echo  Pushing verified commit %VERIFIED:~0,7% to origin/main...
echo.
git push origin %VERIFIED%:main
echo.
echo  Done. Cloudflare Pages will rebuild automatically.
echo  (Commits made after %VERIFIED:~0,7% were NOT pushed.)
pause
