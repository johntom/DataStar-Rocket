@echo off
setlocal
echo Git: update main
echo ==================
echo see https://github.com/johntom/DataStar-Rocket
echo.
pause
echo [1/5] Refreshing README.md version block from .env (VERSION, VERSION_date, VERSION_mess)...
call npm run update-readme
if errorlevel 1 goto :error
echo.
pause
echo [2/5] Switching to main branch...
git checkout main
if errorlevel 1 goto :error
echo.
pause
echo [3/5] Pulling latest main from origin...
git pull origin main
if errorlevel 1 goto :error
echo.
pause
echo [4/5] Staging changes...
git add -A
if errorlevel 1 goto :error
git diff --cached --quiet && (
  echo Nothing to commit - working tree clean. Skipping commit and push.
  goto :end
)
git status --short
echo.
:prompt_msg
set "MSG="
set /p "MSG=Commit message (Ctrl+C to cancel): "
if not defined MSG (
  echo Message required - please type a commit message. Use Ctrl+C to cancel.
  goto :prompt_msg
)
git commit -m "%MSG%"
if errorlevel 1 goto :error
echo.
pause
echo [5/5] Pushing main to origin...
git push origin main
if errorlevel 1 goto :error
echo.

echo Done - main updated and pushed.
goto :end

:error
echo.
echo *** A step failed (errorlevel %errorlevel%). Stopped - nothing further was run. ***

:end
endlocal
echo see https://github.com/johntom/DataStar-Rocket
pause
