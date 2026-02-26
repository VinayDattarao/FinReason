@echo off
REM AI Financial Management System - Automated Setup Script (Windows)

setlocal enabledelayedexpansion
color 0A

echo ==========================================
echo AI Financial Management System Setup
echo ==========================================
echo.

REM Check prerequisites
echo Checking prerequisites...

where /q node
if errorlevel 1 (
    echo WARNING: Node.js not found. Please install from https://nodejs.org
    exit /b 1
)

where /q python
if errorlevel 1 (
    echo WARNING: Python 3 not found. Please install from https://www.python.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i

echo [OK] Node.js found: %NODE_VERSION%
echo [OK] Python found: %PYTHON_VERSION%
echo.

REM Step 1: Check for .env file
echo Step 1: Checking environment configuration...

if not exist ".env" (
    echo Creating .env file from template...
    (
        echo # Database
        echo DATABASE_URL="postgresql://user:password@host:5432/finance_db"
        echo DIRECT_URL="postgresql://user:password@host:5432/finance_db"
        echo.
        echo # Clerk Authentication
        echo NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
        echo CLERK_SECRET_KEY=sk_test_
        echo NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
        echo NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
        echo NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
        echo NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
        echo.
        echo # AI Services
        echo GEMINI_API_KEY=
        echo ANTHROPIC_API_KEY=
        echo RESEND_API_KEY=
        echo ARCJET_KEY=
        echo.
        echo # AI Agent Backend
        echo AI_AGENT_URL=http://localhost:8000
        echo NODE_ENV=development
    ) > .env
    echo [WARN] Please edit .env with your API keys and database URL
    echo [WARN] Please consult README.md for detailed instructions
) else (
    echo [OK] .env file found
)
echo.

REM Step 2: Frontend Setup
echo Step 2: Setting up frontend...

if not exist "node_modules" (
    echo Installing Node dependencies...
    call npm install --legacy-peer-deps
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

if not exist "node_modules\.prisma" (
    echo Generating Prisma client...
    call npx prisma generate
    echo [OK] Prisma client generated
)

echo.

REM Step 3: AI Agent Setup
echo Step 3: Setting up AI Agent...

cd ai-agent

if not exist ".env" (
    echo Creating AI Agent .env file...
    (
        echo ANTHROPIC_API_KEY=
        echo GEMINI_API_KEY=
        echo DATABASE_URL="postgresql://user:password@host:5432/finance_db"
        echo DIRECT_URL="postgresql://user:password@host:5432/finance_db"
        echo AI_MODEL=claude-3-sonnet-20240229
        echo TEMPERATURE=0.7
        echo MAX_TOKENS=2048
        echo HOST=0.0.0.0
        echo PORT=8000
        echo LOG_LEVEL=INFO
    ) > .env
    echo [WARN] AI Agent .env created. Please update with your API keys
)

if not exist "venv" (
    echo Creating Python virtual environment...
    call python -m venv venv
    
    echo Activating virtual environment and installing dependencies...
    call venv\Scripts\activate.bat
    call pip install -r requirements.txt
    echo [OK] Python environment set up
) else (
    echo [OK] Python virtual environment already exists
)

cd ..

echo.
echo ==========================================
echo Setup completed successfully! [OK]
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Update .env with your API keys:
echo    - DATABASE_URL (Supabase or local PostgreSQL^)
echo    - CLERK_* keys (from clerk.com^)
echo    - GEMINI_API_KEY (from aistudio.google.com^)
echo    - ANTHROPIC_API_KEY (from console.anthropic.com^)
echo.
echo 2. (Optional^) Run database migrations:
echo    npx prisma migrate deploy
echo.
echo 3. Start the services in separate terminals (cmd.exe):
echo.
echo    Terminal 1 - Frontend:
echo    npm run dev
echo.
echo    Terminal 2 - AI Agent:
echo    cd ai-agent
echo    venv\Scripts\activate.bat
echo    python main.py
echo.
echo    Terminal 3 - Test (optional^):
echo    cd ai-agent
echo    venv\Scripts\activate.bat
echo    python cli.py
echo.
echo 4. Access the system:
echo    Frontend: http://localhost:3000
echo    AI API: http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo For detailed instructions, refer to README.md in the project root.
echo.

pause
