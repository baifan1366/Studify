import { Metadata } from 'next';
import RecommendationsContent from '@/components/recommendations/recommendations-content';

export const metadata: Metadata = {
  title: 'Course Recommendations - Studify',
  description: 'Discover personalized course recommendations based on your learning progress and interests.',
};

export default function RecommendationsPage() {
  return <RecommendationsContent />;
}
