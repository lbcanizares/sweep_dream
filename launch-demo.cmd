@echo off
cd /d "%~dp0"
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto failed
call npm.cmd run build
if errorlevel 1 goto failed
echo Open http://127.0.0.1:5173 after the server starts.
echo Classroom admin key: sweep-dreams-class-demo
call npm.cmd run demo
goto end
:failed
echo Setup failed. Check internet access and install Node.js 20.19+ or 22.12+.
:end
pause
