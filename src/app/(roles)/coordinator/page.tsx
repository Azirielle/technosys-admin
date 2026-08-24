import DispatchBoardClient from '@/components/dashboard/DispatchBoardClient';

export default function SchedulingPage() {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 min-h-0">
        <DispatchBoardClient />
      </div>
    </div>
  );
}
