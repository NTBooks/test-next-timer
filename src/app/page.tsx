import AnalogClock from "@/components/AnalogClock";
import Timer from "@/components/Timer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-12">
      <h1 className="text-4xl font-bold">Analog Clock & Timer</h1>
      <AnalogClock />
      <Timer />
    </main>
  );
}
