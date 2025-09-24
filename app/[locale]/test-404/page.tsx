import { notFound } from 'next/navigation';

export default function Test404Page() {
  // This will trigger the not-found.tsx page
  notFound();
}
