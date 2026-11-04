@echo off
chcp 65001 >nul
title Deploy Checkout Pro - GitHub
echo.
echo ====================================================================
echo  🚀 ENVIANDO O CHECKOUT PARA O GITHUB (Lucas999mar/checkout)
echo ====================================================================
echo.
cd /d "%~dp0"

echo [1/2] Verificando status do Git...
git status -s

echo.
echo [2/2] Enviando branch main para https://github.com/Lucas999mar/checkout.git...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================================
    echo  ✅ SUCESSO! Codigo enviado com sucesso para o GitHub!
    echo  Repositorio: https://github.com/Lucas999mar/checkout
    echo ====================================================================
) else (
    echo.
    echo ====================================================================
    echo  ⚠️ Se o GitHub solicitou login, faca a autorizacao na janela do
    echo  navegador que abriu e tente novamente.
    echo ====================================================================
)

echo.
pause

