import { NextResponse } from "next/server";
import { broadcastEvent } from "@/lib/eventBroadcaster";

type Alarm = {
  id: string;
  name: string;
  dateTime: Date;
  sound: string;
  isActive: boolean;
  targetDevice: string;
  duration: number;
  endTime: Date;
};

const timerList: Alarm[] = [];

export async function GET() {
  try {
    // If no time parameter, return current timer state
    return NextResponse.json(timerList);
  } catch (error) {
    console.error("Error in GET request:", error);
    return NextResponse.json(
      { error: "Failed to get timer state" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { duration } = await request.json();

    if (!duration || typeof duration !== "number") {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // Add a new timer to the list
    const newTimer: Alarm = {
      id: Date.now().toString(),
      name: "Test Timer",
      duration,
      endTime: new Date(Date.now() + duration * 1000),
      isActive: true,
      targetDevice: "Test Device",
      dateTime: new Date(),
      sound: "default",
    };

    broadcastEvent({
      type: "NEW_TIMER",
      timer: newTimer,
    });

    return NextResponse.json({
      success: true,
      message: `Timer set for ${duration} seconds`,
    });
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json({ error: "Failed to set timer" }, { status: 500 });
  }
}
