import { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { HintLevel, HINT_CONFIG, Treasure } from './utils/gameUtils';

type GameState = 'menu' | 'playing' | 'levelComplete' | 'gameOver';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [hint, setHint] = useState<HintLevel>('freezing');
  const [searchCount, setSearchCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [lastFoundEmoji, setLastFoundEmoji] = useState('');
  const [showFoundFlash, setShowFoundFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('treasureHuntBest');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Timer
  useEffect(() => {
    if (gameState === 'playing') {
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, level]);

  const startGame = useCallback(() => {
    setLevel(1);
    setScore(0);
    setTotalFound(0);
    setSearchCount(0);
    setHint('freezing');
    setGameState('playing');
  }, []);

  const nextLevel = useCallback(() => {
    setLevel((l) => l + 1);
    setTotalFound(0);
    setSearchCount(0);
    setHint('freezing');
    setGameState('playing');
  }, []);

  const handleTreasureFound = useCallback(
    (treasure: Treasure) => {
      const timeBonus = Math.max(0, 500 - timer * 2);
      const searchBonus = Math.max(0, 300 - searchCount * 5);
      const levelMultiplier = level;
      const points = (100 + timeBonus + searchBonus) * levelMultiplier;

      setScore((s) => s + points);
      setTotalFound((t) => t + 1);
      setLastFoundEmoji(treasure.emoji);
      setShowFoundFlash(true);
      setTimeout(() => setShowFoundFlash(false), 1500);
    },
    [timer, searchCount, level]
  );

  const handleAllFound = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('levelComplete');

    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('treasureHuntBest', score.toString());
    }
  }, [score, bestScore]);

  const handleHintChange = useCallback((h: HintLevel) => {
    setHint(h);
  }, []);

  const handleSearchCountChange = useCallback((count: number) => {
    setSearchCount(count);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hintConf = HINT_CONFIG[hint];
  const treasureCount = Math.min(2 + level, 8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col overflow-hidden">
      {/* Found Flash Overlay */}
      {showFoundFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-ping">
          <span className="text-8xl">{lastFoundEmoji}</span>
        </div>
      )}

      {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-lg">
            <div className="mb-8 animate-bounce">
              <span className="text-8xl">🗺️</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              Treasure Hunt
            </h1>
            <p className="text-slate-400 text-lg mb-2">
              Click the canvas to search for hidden treasures!
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Follow the hot/cold hints to find them all.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8 text-sm">
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <div className="text-2xl mb-1">❄️</div>
                <div className="text-slate-400">Cold = Far</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-slate-400">Hot = Close</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <div className="text-2xl mb-1">🎉</div>
                <div className="text-slate-400">Click = Find</div>
              </div>
            </div>

            {bestScore > 0 && (
              <p className="text-amber-400/70 text-sm mb-4">
                🏆 Best Score: {bestScore.toLocaleString()}
              </p>
            )}

            <button
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-2xl font-bold text-xl shadow-xl shadow-orange-500/25 transition-all hover:scale-105 hover:shadow-orange-500/40 active:scale-95 cursor-pointer"
            >
              Start Hunting! 🏴‍☠️
            </button>
          </div>
        </div>
      )}

      {/* Game Playing */}
      {gameState === 'playing' && (
        <>
          {/* Top HUD */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-1.5">
                <span className="text-amber-400 text-sm font-bold">LVL {level}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-1.5">
                <span className="text-sm">⭐</span>
                <span className="text-sm font-semibold text-slate-200">
                  {score.toLocaleString()}
                </span>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-sm transition-all duration-300"
              style={{
                backgroundColor: hintConf.bgColor,
                color: hintConf.color,
                boxShadow: `0 0 20px ${hintConf.glowColor}`,
              }}
            >
              {hintConf.label}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-1.5">
                <span className="text-sm">🔍</span>
                <span className="text-sm font-semibold text-slate-200">{searchCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-1.5">
                <span className="text-sm">⏱️</span>
                <span className="text-sm font-semibold text-slate-200">
                  {formatTime(timer)}
                </span>
              </div>
            </div>
          </div>

          {/* Treasure Progress Bar */}
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-20">Treasures:</span>
              <div className="flex-1 flex items-center gap-1.5">
                {Array.from({ length: treasureCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-500 ${
                      i < totalFound
                        ? 'bg-amber-500/30 scale-110 border border-amber-500/50'
                        : 'bg-slate-800/50 border border-slate-700/30'
                    }`}
                  >
                    {i < totalFound ? '💎' : '?'}
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                {totalFound}/{treasureCount}
              </span>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 p-3 pb-4">
            <div
              className="w-full h-full rounded-2xl overflow-hidden border-2 transition-all duration-500"
              style={{
                borderColor: hintConf.color + '40',
                boxShadow: `0 0 30px ${hintConf.glowColor}, inset 0 0 30px ${hintConf.bgColor}`,
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
              }}
            >
              <GameCanvas
                level={level}
                onTreasureFound={handleTreasureFound}
                onAllFound={handleAllFound}
                onHintChange={handleHintChange}
                onSearchCountChange={handleSearchCountChange}
                isPlaying={gameState === 'playing'}
              />
            </div>
          </div>
        </>
      )}

      {/* Level Complete Screen */}
      {gameState === 'levelComplete' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-4 flex justify-center gap-2 text-5xl animate-bounce">
              <span>🎉</span>
              <span className="delay-100">🏆</span>
              <span className="delay-200">🎊</span>
            </div>
            <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Level {level} Complete!
            </h2>
            <p className="text-slate-400 mb-8">All treasures found!</p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-2xl font-bold text-amber-400">
                  {score.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">Score</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-2xl font-bold text-cyan-400">{formatTime(timer)}</div>
                <div className="text-xs text-slate-500 mt-1">Time</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                <div className="text-2xl font-bold text-purple-400">{searchCount}</div>
                <div className="text-xs text-slate-500 mt-1">Searches</div>
              </div>
            </div>

            {score >= bestScore && score > 0 && (
              <div className="mb-6 py-2 px-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm font-semibold">
                🏆 New Best Score!
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setGameState('menu')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 border border-slate-700 cursor-pointer"
              >
                Menu
              </button>
              <button
                onClick={nextLevel}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-bold shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Next Level →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
