import MapComponent from './components/MapComponent'; // Sesuaikan path import jika MapComponent ada di dalam folder components

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <MapComponent />
    </main>
  );
}