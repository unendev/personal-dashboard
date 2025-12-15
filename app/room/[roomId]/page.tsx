import { RoomEntry } from "@/app/components/goc/RoomEntry";
import TacticalBoard from "@/app/components/goc/TacticalBoard";
import CommandCenter from "@/app/components/goc/CommandCenter";
import Viewport from "@/app/components/goc/Viewport";

interface PageProps {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    name?: string;
  }>;
}

export default async function RoomPage({ params, searchParams }: PageProps) {
  const { roomId } = await params;
  const { name } = await searchParams;

  return (
    <RoomEntry roomId={roomId} initialUserName={name}>
      <div className="grid grid-cols-12 h-screen w-full overflow-hidden bg-[#0a0a0a]">
        {/* Left: Tactical Board (25%) */}
        <div className="col-span-3 h-full overflow-hidden">
          <TacticalBoard />
        </div>

        {/* Middle: Command Center (45%) */}
        <div className="col-span-5 h-full overflow-hidden border-x border-zinc-800">
          <CommandCenter />
        </div>

        {/* Right: Viewport (30%) */}
        <div className="col-span-4 h-full overflow-hidden">
          <Viewport />
        </div>
      </div>
    </RoomEntry>
  );
}