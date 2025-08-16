import InfoStreamWidget from './components/InfoStreamWidget';
import MusicWidget from './components/MusicWidget';

export default function Home() {
  return (
    <main className="w-full h-full">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="w-full flex flex-col lg:flex-row gap-8">
        <div className="flex-grow lg:w-2/3">
          <InfoStreamWidget />
        </div>
        <div className="flex-shrink-0 lg:w-1/3">
          <MusicWidget />
        </div>
      </div>
    </main>
  );
}
