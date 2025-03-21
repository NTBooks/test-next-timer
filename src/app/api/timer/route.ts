import { NextResponse } from "next/server";

let activeTimer: NodeJS.Timeout | null = null;
let timerEndTime: number | null = null;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const time = searchParams.get("time");

    // If time parameter is provided, set a new timer
    if (time) {
      const duration = parseInt(time);
      if (isNaN(duration) || duration <= 0) {
        return NextResponse.json(
          { error: "Invalid time value" },
          { status: 400 }
        );
      }

      // Clear any existing timer
      if (activeTimer) {
        clearTimeout(activeTimer);
      }

      // Set new timer
      timerEndTime = Date.now() + duration * 1000;
      activeTimer = setTimeout(() => {
        // Timer completed
        activeTimer = null;
        timerEndTime = null;
      }, duration * 1000);

      return NextResponse.json({
        success: true,
        message: `Timer set for ${duration} seconds`,
        endTime: timerEndTime,
      });
    }

    // If no time parameter, return current timer state
    return NextResponse.json({
      active: activeTimer !== null,
      endTime: timerEndTime,
      timeLeft: timerEndTime
        ? Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000))
        : 0,
    });
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

    // Clear any existing timer
    if (activeTimer) {
      clearTimeout(activeTimer);
    }

    // Set new timer
    timerEndTime = Date.now() + duration * 1000;
    activeTimer = setTimeout(() => {
      // Timer completed
      activeTimer = null;
      timerEndTime = null;
    }, duration * 1000);

    return NextResponse.json({
      success: true,
      message: `Timer set for ${duration} seconds`,
      endTime: timerEndTime,
    });
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json({ error: "Failed to set timer" }, { status: 500 });
  }
}

export async function DELETE() {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
    timerEndTime = null;
    return NextResponse.json({
      success: true,
      message: "Timer stopped",
    });
  }
  return NextResponse.json({ error: "No active timer" }, { status: 404 });
}
