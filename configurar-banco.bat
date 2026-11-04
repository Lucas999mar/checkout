@echo off
chcp 65001 >nul
title Configurar Banco de Dados - Supabase / PostgreSQL
echo.
echo ====================================================================
echo  🏦 CONFIGURADOR AUTOMÁTICO DO BANCO DE DADOS (SUPABASE / POSTGRES)
echo ====================================================================
echo.
cd /d "%~dp0"

set /p DB_URL="Cole aqui a Connection String (DATABASE_URL) do Supabase: "

if "%DB_URL%"=="" (
    echo.
    echo ❌ Erro: Nenhuma URL foi informada.
    pause
    exit /b 1
)

echo.
echo [1/3] Atualizando arquivo .env...
findstr /v "DATABASE_URL" .env > .env.temp 2>nul
echo DATABASE_URL="%DB_URL%" >> .env.temp
move /y .env.temp .env >nul

echo [2/3] Criando todas as tabelas no Supabase (prisma db push)...
call npx prisma db push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erro ao conectar com o Supabase. Verifique a senha e a URL.
    pause
    exit /b 1
)

echo.
echo [3/3] Criando usuario admin e dados iniciais (db:seed)...
call npm run db:seed

echo.
echo ====================================================================
echo  🎉 BANCO CONFIGURADO COM SUCESSO NO SUPABASE!
echo  Tabelas criadas: users, products, prices, payments, bank_configs...
echo  Login do Painel: admin@checkout.com ^| Senha: admin123
echo ====================================================================
echo.
pause
