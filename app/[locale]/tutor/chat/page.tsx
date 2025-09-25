import React from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ChatPageClient } from '@/components/chat/chat-page-client';

/**
 * Tutor Chat Page Component
 * Main chat interface with conversations list and message panel for tutors
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ChatPage');

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default function TutorChatPage() {
  return <ChatPageClient />;
}
