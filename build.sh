#!/bin/bash

# Instalar dependências
npm install

# Construir o projeto
npm run build

# Garantir que o arquivo vercel.json seja copiado para a pasta dist
cp vercel.json dist/
