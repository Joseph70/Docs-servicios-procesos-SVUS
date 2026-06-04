@echo off
setlocal
cd /d "%~dp0"

set "REPO_NAME=Docs-servicios-procesos-SVUS"
set "GIT_DIR=%CD%\.upload-git"

echo.
echo Subiendo este proyecto al repositorio %REPO_NAME%...
echo.

if not exist "%GIT_DIR%" (
  echo No existe el repositorio local de subida. Ejecuta primero la preparacion del proyecto.
  pause
  exit /b 1
)

echo Verificando sesion de GitHub CLI...
"C:\Program Files\GitHub CLI\gh.exe" auth status
if errorlevel 1 (
  echo.
  echo No hay sesion activa en GitHub CLI. Ejecuta:
  echo "C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com --git-protocol https --web
  pause
  exit /b 1
)

for /f "tokens=*" %%u in ('"C:\Program Files\GitHub CLI\gh.exe" api user --jq .login') do set GH_USER=%%u

if "%GH_USER%"=="" (
  echo.
  echo No pude detectar tu usuario de GitHub.
  set /p GH_USER=Escribe tu usuario de GitHub:
)

echo.
echo Usando usuario GitHub: %GH_USER%
echo Repositorio: https://github.com/%GH_USER%/%REPO_NAME%
echo.

"C:\Program Files\GitHub CLI\gh.exe" repo view "%GH_USER%/%REPO_NAME%" >nul 2>nul
if errorlevel 1 (
  echo Creando repositorio en GitHub...
  "C:\Program Files\GitHub CLI\gh.exe" repo create "%GH_USER%/%REPO_NAME%" --private --disable-wiki
  if errorlevel 1 (
    echo No pude crear el repositorio.
    pause
    exit /b 1
  )
) else (
  echo El repositorio ya existe.
)

"C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." remote remove origin 2>nul
"C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." remote add origin "https://github.com/%GH_USER%/%REPO_NAME%.git"

echo.
echo Guardando archivos actuales...
"C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." config user.name "Joseph"
"C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." config user.email "joseph@users.noreply.github.com"
"C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." add -- "index.html" "Fichas de servicio.html" "styles.css" "script.js" "LOGO BLANCO.png" "logo-blanco-transparente.png" "logo-impresion-color.png" "svus-logo.png" "SERVICIO VISA AMERICA B1-B2.docx" "publish-github.cmd"
"C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." diff --cached --quiet
if errorlevel 1 (
  "C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." commit -m "Update service docs manual"
) else (
  echo No hay cambios nuevos para guardar.
)

echo.
echo Subiendo a GitHub...
"C:\Program Files\Git\cmd\git.exe" --git-dir="%GIT_DIR%" --work-tree="." push -u origin main
if errorlevel 1 (
  echo.
  echo No se pudo subir. Revisa tu conexion o vuelve a ejecutar este archivo despues de iniciar sesion.
  pause
  exit /b 1
)

echo.
echo Listo: https://github.com/%GH_USER%/%REPO_NAME%
pause
