@echo off
REM
REM Set Project specific variables here.
REM
set PATH=%PATH%;%windir%\Microsoft.Net\Framework\v4.0.30319
set EnableNuGetPackageRestore=true
set BRANCH=master
set GITHUBSSH=
set PROJECT_NAME=Forerunner
set HOME=%HOMEDRIVE%%HOMEPATH%
set SPSITE=https://forerunnersw.sharepoint.com
set SPRELEASE=/Shared Documents/Build
set CODESIGN_KEYDIR=%~dp0..\Key
set CODESIGN_KEYFILE=ForerunnerCert2015.pfx
call %~dp0%COMPUTERNAME%.cmd
