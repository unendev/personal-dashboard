import InfoStreamWidget from './components/InfoStreamWidget';
import MusicWidget from './components/MusicWidget';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-12">
      <h1 className="text-4xl font-bold mb-12 text-center">Project Nexus</h1>
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8">
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
