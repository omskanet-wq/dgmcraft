import { useEffect } from 'react';
import { useGameStore } from './state/useGameStore';
import { CharacterSelect } from './scenes/CharacterSelect';
import { WorldScene } from './scenes/WorldScene';
import { StrongholdScene } from './scenes/StrongholdScene';
import './App.css';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const toast = useGameStore((s) => s.toast);
  const setToast = useGameStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast, setToast]);

  return (
    <>
      {screen === 'select' && <CharacterSelect />}
      {screen === 'world' && <WorldScene />}
      {screen === 'stronghold' && <StrongholdScene />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
