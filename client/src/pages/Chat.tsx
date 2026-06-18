import { ChatScene } from '../components/chat/ChatScene';

export default function Chat() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 mesh-bg opacity-60" />
      <div className="relative z-10">
        <ChatScene />
      </div>
    </div>
  );
}
