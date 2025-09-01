import { NextResponse } from 'next/server';

// Mock enrolled courses data
const enrolledCourses = [
  {
    id: 1,
    title: "Advanced Mathematics",
    instructor: "Dr. Sarah Johnson",
    progress: 75,
    totalLessons: 24,
    completedLessons: 18,
    nextLesson: "Calculus Integration",
    dueDate: "2024-01-15",
    status: "active",
    color: "from-blue-500 to-cyan-500",
    lastAccessed: "2 hours ago"
  },
  {
    id: 2,
    title: "Physics Fundamentals",
    instructor: "Prof. Michael Chen",
    progress: 45,
    totalLessons: 20,
    completedLessons: 9,
    nextLesson: "Newton's Laws",
    dueDate: "2024-01-20",
    status: "active",
    color: "from-purple-500 to-pink-500",
    lastAccessed: "1 day ago"
  },
  {
    id: 3,
    title: "Chemistry Lab",
    instructor: "Dr. Emily Davis",
    progress: 90,
    totalLessons: 16,
    completedLessons: 14,
    nextLesson: "Final Project",
    dueDate: "2024-01-10",
    status: "near_completion",
    color: "from-green-500 to-teal-500",
    lastAccessed: "3 hours ago"
  },
  {
    id: 4,
    title: "Computer Science",
    instructor: "Mr. David Lee",
    progress: 25,
    totalLessons: 32,
    completedLessons: 8,
    nextLesson: "Data Structures",
    dueDate: "2024-02-01",
    status: "behind",
    color: "from-orange-500 to-red-500",
    lastAccessed: "5 days ago"
  }
];

export async function GET() {
  // In a real application, you would fetch this data from your database
  // based on the currently authenticated user.
  return NextResponse.json(enrolledCourses);
}
