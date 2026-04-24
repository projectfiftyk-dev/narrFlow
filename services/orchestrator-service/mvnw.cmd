@echo off
setlocal EnableDelayedExpansion

set MAVEN_VERSION=3.9.6
set DIST_DIR=%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%
set MAVEN_HOME=%DIST_DIR%\apache-maven-%MAVEN_VERSION%
set MVN_CMD=!MAVEN_HOME!\bin\mvn.cmd

if not exist "!MVN_CMD!" (
    echo Apache Maven %MAVEN_VERSION% not found. Downloading...
    if not exist "!DIST_DIR!" mkdir "!DIST_DIR!"
    set DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip
    set ZIP_FILE=!DIST_DIR!\maven.zip
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!DOWNLOAD_URL!' -OutFile '!ZIP_FILE!'"
    powershell -Command "Expand-Archive -Path '!ZIP_FILE!' -DestinationPath '!DIST_DIR!' -Force"
    del "!ZIP_FILE!"
    echo Maven downloaded successfully.
)

"!MVN_CMD!" %*
endlocal
