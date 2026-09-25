import { ReglagesSidebar } from "@/components/team/ReglagesSidebar";

export default function ReglagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <ReglagesSidebar />
      <div className="min-w-0 flex-1 px-10 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  );
}
