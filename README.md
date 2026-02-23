♠️ Royal Poker – Texas Hold'em Multiplayer
Projeto desenvolvido para a disciplina APS (Análise e Projeto de Sistemas) do curso de Análise e Desenvolvimento de Sistemas do Instituto Federal da Bahia – Câmpus Ilhéus, sob orientação do professor Ciro Esteves Lima Sobral.

👥 Equipe
Alício da Silva Cruz

Breno Guedes Lemos

Éder da Silva Cruz

Haniel Filipe Conselho Dias Lima

Jonathan Neri Rodrigues

Luiz Otávio Matos Moreno

Nauan Nascimento Oliveira

Therles Kaleb Oliveira de Azevedo

📋 Sobre o Projeto
O Royal Poker é uma plataforma web multiplayer para jogar Texas Hold'em online, criada a partir dos requisitos levantados com o cliente. O objetivo é reproduzir a experiência do jogo presencial, mantendo o aspecto social por meio de salas privadas e chat integrado, além de automatizar toda a dinâmica de cartas, apostas e blinds.

O sistema foi desenvolvido como parte da disciplina de Análise e Projeto de Sistemas, seguindo boas práticas de documentação de requisitos e modelagem.

✨ Funcionalidades
Criação de salas privadas com acesso por convite

Gerenciamento completo do baralho (52 cartas, estados, embaralhamento criptográfico)

Sistema de blinds (small blind e big blind) com rotação automática

Rodadas de apostas: fold, check, call, raise, all-in

Cálculo de pote principal e side-pots em situações de all-in múltiplo

Cartas comunitárias (flop, turn, river)

Chat em tempo real (texto)

Painel de estatísticas ao final da partida (maior pote, taxa de desistência)

Interface intuitiva e ajuda para novos jogadores

🚀 Tecnologias Utilizadas
Back-end
Node.js + Express

Socket.io (comunicação em tempo real)

CORS

Front-end
React com TypeScript

Socket.io-client

CSS3 customizado

🛠️ Como Executar o Projeto Localmente
Pré-requisitos
Node.js (versão 16 ou superior)

Git (opcional)

Passo a passo
Clone o repositório

bash
git clone https://github.com/seu-usuario/royal-poker.git
cd royal-poker
Instale as dependências do servidor

bash
cd server
npm install
Inicie o servidor

bash
node index.js
O servidor rodará em http://localhost:3001.

Em outro terminal, instale as dependências do cliente

bash
cd ../client
npm install
Inicie o cliente

bash
npm start
O front-end será aberto em http://localhost:3000.

Acesse o jogo
Abra o navegador no endereço http://localhost:3000, crie uma sala e convide amigos para jogar!
