// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // URL do nosso frontend
    methods: ["GET", "POST"]
  }
});

// Armazenamento simples em memória (para teste)
let rooms = {};          // salas ativas
let players = {};        // jogadores conectados por socketId

// Classe Deck (baralho) – implementação simplificada
class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }
  reset() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    this.cards = [];
    for (let suit of suits) {
      for (let rank of ranks) {
        this.cards.push(`${rank}${suit}`);
      }
    }
  }
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  deal() {
    return this.cards.pop();
  }
}

// Função para avaliar a melhor mão (simplificada – apenas para teste)
// Numa versão completa, usaríamos uma biblioteca como poker-evaluator
function evaluateHand(hand) {
  // Retorna um número aleatório para simular (substituir depois)
  return Math.random();
}

// Socket.io – comunicação em tempo real
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Criar uma nova sala
  socket.on('createRoom', ({ playerName, roomName, maxPlayers }) => {
    const roomId = Math.random().toString(36).substring(2, 8); // id aleatório
    rooms[roomId] = {
      id: roomId,
      name: roomName,
      players: [],
      maxPlayers: maxPlayers || 4,
      deck: new Deck(),
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerIndex: 0,
      smallBlind: 10,
      bigBlind: 20,
      phase: 'waiting', // waiting, preflop, flop, turn, river, showdown
      turnIndex: 0,
      lastRaise: 0
    };

    // Adicionar o criador como primeiro jogador
    const player = {
      id: socket.id,
      name: playerName,
      stack: 1000,
      cards: [],
      bet: 0,
      folded: false,
      allIn: false
    };
    rooms[roomId].players.push(player);
    players[socket.id] = { roomId, player };

    socket.join(roomId);
    socket.emit('roomCreated', { roomId, room: rooms[roomId] });
    io.to(roomId).emit('updateRoom', rooms[roomId]);
  });

  // Entrar em uma sala existente
  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('error', 'Sala não encontrada');
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', 'Sala cheia');
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      stack: 1000,
      cards: [],
      bet: 0,
      folded: false,
      allIn: false
    };
    room.players.push(player);
    players[socket.id] = { roomId, player };

    socket.join(roomId);
    io.to(roomId).emit('updateRoom', room);
  });

  // Iniciar o jogo (apenas o criador pode)
  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length < 2) {
      socket.emit('error', 'Mínimo de 2 jogadores');
      return;
    }

    // Resetar o baralho e distribuir cartas
    room.deck.reset();
    room.deck.shuffle();
    room.communityCards = [];
    room.pot = 0;
    room.currentBet = 0;
    room.phase = 'preflop';
    room.players.forEach(p => {
      p.cards = [];
      p.bet = 0;
      p.folded = false;
      p.allIn = false;
    });

    // Distribuir duas cartas para cada jogador
    for (let i = 0; i < 2; i++) {
      room.players.forEach(p => {
        p.cards.push(room.deck.deal());
      });
    }

    // Definir os blinds
    const smallBlindPlayer = room.players[(room.dealerIndex + 1) % room.players.length];
    const bigBlindPlayer = room.players[(room.dealerIndex + 2) % room.players.length];
    smallBlindPlayer.stack -= room.smallBlind;
    smallBlindPlayer.bet = room.smallBlind;
    bigBlindPlayer.stack -= room.bigBlind;
    bigBlindPlayer.bet = room.bigBlind;
    room.pot = room.smallBlind + room.bigBlind;
    room.currentBet = room.bigBlind;
    room.lastRaise = room.bigBlind;
    room.turnIndex = (room.dealerIndex + 3) % room.players.length; // primeiro a agir depois do big blind

    io.to(roomId).emit('gameStarted', room);
  });

  // Ações do jogador: fold, check, call, raise
  socket.on('playerAction', ({ roomId, action, amount }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = players[socket.id]?.player;
    if (!player) return;

    // Verifica se é a vez do jogador
    if (room.players[room.turnIndex].id !== socket.id) return;

    switch (action) {
      case 'fold':
        player.folded = true;
        break;
      case 'check':
        // Só pode check se a aposta atual for zero
        if (room.currentBet > player.bet) return;
        break;
      case 'call':
        const callAmount = room.currentBet - player.bet;
        if (player.stack < callAmount) {
          // all-in
          player.allIn = true;
          room.pot += player.stack;
          player.bet += player.stack;
          player.stack = 0;
        } else {
          player.stack -= callAmount;
          player.bet += callAmount;
          room.pot += callAmount;
        }
        break;
      case 'raise':
        if (amount <= room.currentBet) return; // raise mínimo maior que a aposta atual
        if (player.stack < amount - player.bet) return; // não tem fichas suficientes
        player.stack -= (amount - player.bet);
        room.pot += (amount - player.bet);
        player.bet = amount;
        room.currentBet = amount;
        room.lastRaise = amount;
        break;
      default:
        return;
    }

    // Avançar para o próximo jogador ativo
    let nextIndex = (room.turnIndex + 1) % room.players.length;
    while (nextIndex !== room.turnIndex) {
      const nextPlayer = room.players[nextIndex];
      if (!nextPlayer.folded && !nextPlayer.allIn && nextPlayer.stack > 0) {
        break;
      }
      nextIndex = (nextIndex + 1) % room.players.length;
    }

    // Verificar se a rodada terminou (todos apostaram o mesmo ou all-in)
    const allBetsMatch = room.players.every(p => p.folded || p.allIn || p.bet === room.currentBet);
    if (allBetsMatch) {
      // Avançar para a próxima fase
      if (room.phase === 'preflop') {
        room.phase = 'flop';
        // Queimar uma carta e colocar 3 comunitárias
        room.deck.deal(); // descarta
        for (let i = 0; i < 3; i++) room.communityCards.push(room.deck.deal());
        room.currentBet = 0;
        room.players.forEach(p => p.bet = 0);
        room.turnIndex = (room.dealerIndex + 1) % room.players.length; // small blind age primeiro no flop
      } else if (room.phase === 'flop') {
        room.phase = 'turn';
        room.deck.deal(); // descarta
        room.communityCards.push(room.deck.deal());
        room.currentBet = 0;
        room.players.forEach(p => p.bet = 0);
        room.turnIndex = (room.dealerIndex + 1) % room.players.length;
      } else if (room.phase === 'turn') {
        room.phase = 'river';
        room.deck.deal(); // descarta
        room.communityCards.push(room.deck.deal());
        room.currentBet = 0;
        room.players.forEach(p => p.bet = 0);
        room.turnIndex = (room.dealerIndex + 1) % room.players.length;
      } else if (room.phase === 'river') {
        room.phase = 'showdown';
        // Determinar vencedor (simplificado: escolher aleatório)
        const activePlayers = room.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
          // Único jogador restante ganha
          activePlayers[0].stack += room.pot;
        } else {
          // Vários – distribuir aleatoriamente (substituir por avaliação real)
          const winnerIndex = Math.floor(Math.random() * activePlayers.length);
          activePlayers[winnerIndex].stack += room.pot;
        }
        room.pot = 0;
        // Rotacionar dealer
        room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
      }
    } else {
      room.turnIndex = nextIndex;
    }

    io.to(roomId).emit('updateRoom', room);
  });

  // Chat
  socket.on('sendMessage', ({ roomId, message }) => {
    const player = players[socket.id]?.player;
    if (!player) return;
    io.to(roomId).emit('chatMessage', {
      player: player.name,
      message,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // Desconexão
  socket.on('disconnect', () => {
    const playerData = players[socket.id];
    if (playerData) {
      const { roomId, player } = playerData;
      const room = rooms[roomId];
      if (room) {
        // Remover jogador da sala
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('updateRoom', room);
        }
      }
      delete players[socket.id];
    }
    console.log('Cliente desconectado:', socket.id);
  });
});

// Rota simples para teste
app.get('/', (req, res) => {
  res.send('Servidor Royal Poker funcionando!');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});