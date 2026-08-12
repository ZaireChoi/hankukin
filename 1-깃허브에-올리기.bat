@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  HANKUKIN - GitHub 업로드
echo ------------------------------------------------------------
echo  올릴 위치: https://github.com/ZaireChoi/hankukin
echo  올릴 폴더: %cd%
echo ============================================================
echo.
echo  처음 실행하면 브라우저에 GitHub 로그인 창이 뜰 수 있습니다.
echo  로그인하면 자동으로 이어서 진행됩니다.
echo.
pause

echo.
echo [1/6] 저장소 초기화...
git init -b main
if errorlevel 1 goto :nogit

echo [2/6] 파일 추가...
git add .

echo [3/6] 커밋...
git -c user.name="ZaireChoi" -c user.email="suyol1974@gmail.com" commit -m "HANKUKIN Phase 1 MVP scaffold"

echo [4/6] 원격 저장소 연결...
git remote remove origin 2>nul
git remote add origin https://github.com/ZaireChoi/hankukin.git

echo [5/6] 업로드...
git push -u origin main --force
if errorlevel 1 goto :pushfail

echo [6/6] 완료
echo.
echo ============================================================
echo  성공했습니다.
echo  https://github.com/ZaireChoi/hankukin 에서 확인하세요.
echo ============================================================
echo.
pause
exit /b 0

:nogit
echo.
echo [오류] git 을 찾을 수 없습니다.
echo Git Bash 가 설치돼 있지만 PATH 에 없을 수 있습니다.
echo 바탕화면의 Git Bash 를 열고 아래를 붙여넣어 주세요:
echo.
echo   cd /c/Users/user/hankukin
echo   git init -b main ^&^& git add . ^&^& git commit -m "HANKUKIN Phase 1 MVP scaffold"
echo   git remote add origin https://github.com/ZaireChoi/hankukin.git
echo   git push -u origin main --force
echo.
pause
exit /b 1

:pushfail
echo.
echo [오류] 업로드에 실패했습니다.
echo 위 메시지를 그대로 복사해서 알려주세요.
echo.
pause
exit /b 1
