// src/App.tsx
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';

// Tipos
interface Player {
  id: string;
  name: string;
  stack: number;
  cards: string[];
  bet: number;
  folded: boolean;
  allIn: boolean;
}

interface Room {
  id: string;
  name: string;
  players: Player[];
  maxPlayers: number;
  communityCards: string[];
  pot: number;
  currentBet: number;
  phase: string;
  turnIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
}

interface Message {
  player: string;
  message: string;
  timestamp: string;
}

const socket: Socket = io('http://localhost:3001');

function App() {
  const [room, setRoom] = useState<Room | null>(null);
  // Separar os nomes
  const [createPlayerName, setCreatePlayerName] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  // Estado para controlar a visibilidade do tutorial
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    socket.on('roomCreated', ({ roomId, room }) => {
      setRoom(room);
      setRoomId(roomId);
    });

    socket.on('updateRoom', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('gameStarted', (startedRoom: Room) => {
      setRoom(startedRoom);
    });

    socket.on('chatMessage', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('error', (err: string) => {
      setError(err);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('updateRoom');
      socket.off('gameStarted');
      socket.off('chatMessage');
      socket.off('error');
    };
  }, []);

  const createRoom = () => {
    if (!createPlayerName || !roomName) return;
    socket.emit('createRoom', { playerName: createPlayerName, roomName, maxPlayers: 4 });
  };

  const joinRoom = () => {
    if (!joinPlayerName || !roomId) return;
    socket.emit('joinRoom', { roomId, playerName: joinPlayerName });
  };

  const startGame = () => {
    if (room) socket.emit('startGame', { roomId: room.id });
  };

  const sendMessage = () => {
    if (newMessage.trim() && room) {
      socket.emit('sendMessage', { roomId: room.id, message: newMessage });
      setNewMessage('');
    }
  };

  const playerAction = (action: string, amount?: number) => {
    if (room) {
      socket.emit('playerAction', { roomId: room.id, action, amount });
    }
  };

  // Renderização condicional: se não estiver em uma sala, mostra tela de entrada
  if (!room) {
    return (
      <div className="app">
        <h1>Royal Poker • Online Casino</h1>
        {error && <div className="error">{error}</div>}
        
        {/* Botão de tutorial */}
        <div className="tutorial-button-container">
          <button onClick={() => setShowTutorial(true)} className="tutorial-button">📖 Como jogar</button>
        </div>

        <div className="lobby">
          <div className="create-room">
            <h2>Criar Sala</h2>
            <input
              type="text"
              placeholder="Seu nome"
              value={createPlayerName}
              onChange={(e) => setCreatePlayerName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Nome da sala"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button onClick={createRoom}>Criar Sala</button>
          </div>
          <div className="join-room">
            <h2>Entrar em Sala</h2>
            <input
              type="text"
              placeholder="Seu nome"
              value={joinPlayerName}
              onChange={(e) => setJoinPlayerName(e.target.value)}
            />
            <input
              type="text"
              placeholder="ID da sala"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={joinRoom}>Entrar</button>
          </div>
        </div>

        {/* Modal do Tutorial */}
        {showTutorial && (
          <div className="tutorial-modal" onClick={() => setShowTutorial(false)}>
            <div className="tutorial-content" onClick={e => e.stopPropagation()}>
              <h2>🎓 Como jogar Royal Poker</h2>
              <button className="close-button" onClick={() => setShowTutorial(false)}>✕</button>
              
              <h3>Distribuição de Cartas</h3>
              <p>Cada jogador recebe 2 cartas fechadas. 5 cartas comunitárias são reveladas em três rodadas: Flop (3 cartas), Turn (1 carta) e River (1 carta).</p>
              
              <h3>Rodadas de Apostas</h3>
              <p>Após cada distribuição, os jogadores podem apostar, aumentar, passar ou desistir. O pote vai para quem tiver a melhor combinação ou para o último jogador que não desistiu.</p>
              
              <h3>Como Funciona o Blefe</h3>
              <p>Você pode fazer apostas altas mesmo com cartas fracas para fazer seus oponentes desistirem. Mas cuidado: se alguém pagar para ver, você perde!</p>
              
              <h3>Ranking de Mãos (da maior para a menor)</h3>
              <table className="hand-ranking">
                <thead>
                  <tr><th>Rank</th><th>Mão</th></tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td>Straight Flush</td></tr>
                  <tr><td>2</td><td>Full House</td></tr>
                  <tr><td>3</td><td>Sequência</td></tr>
                  <tr><td>4</td><td>Dois Pares</td></tr>
                  <tr><td>5</td><td>Carta Alta</td></tr>
                </tbody>
              </table>
              
              <button className="got-it-button" onClick={() => setShowTutorial(false)}>Entendi, vamos jogar!</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dentro da sala (código existente, sem alterações)
  const currentPlayer = room.players.find(p => p.id === socket.id);
  const isMyTurn = room.players[room.turnIndex]?.id === socket.id && room.phase !== 'showdown' && room.phase !== 'waiting';

  return (
    <div className="app">
      <div className="game-table">
        <div className="header">
          <h2>Sala: {room.name} (ID: {room.id})</h2>
          <p>Fase: {room.phase} | Pote: {room.pot} | Aposta atual: {room.currentBet}</p>
        </div>

        <div className="players-area">
          {room.players.map((player, idx) => (
            <div key={player.id} className={`player-seat ${player.folded ? 'folded' : ''} ${player.id === socket.id ? 'me' : ''}`}>
              <div className="player-name">{player.name} {player.id === socket.id ? '(você)' : ''}</div>
              <div className="player-stack">Fichas: {player.stack}</div>
              <div className="player-cards">
                {player.id === socket.id ? (
                  player.cards.map((card, i) => <span key={i} className="card">{card}</span>)
                ) : (
                  !player.folded && room.phase !== 'waiting' ? <span className="card back">🂠</span> : null
                )}
              </div>
              {player.bet > 0 && <div className="player-bet">Aposta: {player.bet}</div>}
              {idx === room.dealerIndex && <div className="dealer-button">D</div>}
            </div>
          ))}
        </div>

        {/* Botão de iniciar jogo – só aparece para o criador enquanto a sala está em espera */}
        {room.phase === 'waiting' && room.players[0]?.id === socket.id && (
          <div className="start-game">
            <button onClick={startGame}>Iniciar Jogo</button>
          </div>
        )}

        <div className="community-cards">
          {room.communityCards.map((card, i) => (
            <span key={i} className="card">{card}</span>
          ))}
        </div>

        {room.phase !== 'waiting' && (
          <div className="actions">
            {isMyTurn ? (
              <>
                <button onClick={() => playerAction('fold')} disabled={!isMyTurn}>Fold</button>
                <button onClick={() => playerAction('check')} disabled={!isMyTurn || room.currentBet > (currentPlayer?.bet || 0)}>Check</button>
                <button onClick={() => playerAction('call')} disabled={!isMyTurn}>Call</button>
                <button onClick={() => {
                  const amount = prompt('Valor do raise:');
                  if (amount) playerAction('raise', parseInt(amount));
                }} disabled={!isMyTurn}>Raise</button>
              </>
            ) : (
              <p>Aguardando jogadores...</p>
            )}
          </div>
        )}

        {room.phase === 'showdown' && (
          <div className="showdown">
            <h3>Showdown!</h3>
            <button onClick={() => window.location.reload()}>Nova Mão (simplificado)</button>
          </div>
        )}

        <div className="chat-section">
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i}><strong>{msg.player}:</strong> {msg.message} <span className="time">({msg.timestamp})</span></div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;