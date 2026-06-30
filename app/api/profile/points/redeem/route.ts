import { NextResponse } from 'next/server';

// Kept as an explicit tombstone for older clients. The legacy implementation
// enrolled students without an order or tutor earning.
export async function POST() {
  return NextResponse.json(
    { error: 'Use the course checkout to apply points safely.' },
    { status: 410 }
  );
}
