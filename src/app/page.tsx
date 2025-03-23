import Clock from "@/components/Clock";
import DigitalClock from "@/components/DigitalClock";
import Timer from "@/components/Timer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-12">
      <Timer />
    </main>
  );
}
