import { useGameStore } from './state/useGameStore';
import MainMenu from './scenes/MainMenu';
import CityScene from './scenes/CityScene';
import BastionScene from './scenes/BastionScene';
import './App.css';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  return (
    <div className="app-root">
      {screen === 'menu' && <MainMenu />}
      {screen === 'city' && <CityScene />}
      {screen === 'bastion' && <BastionScene />}
    </div>
  );
}
