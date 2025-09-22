import React from 'react';
import { Metadata } from 'next';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ conversationId: string }> }): Promise<Metadata> {
  const { conversationId } = await params;
  const t = await getTranslations('ChatConversationPage');

  return {
    title: `${t('metadata_title')} - ${conversationId}`,
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: `${t('og_title')} - ${conversationId}`,
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <ChatConversation conversationId={conversationId} />;
}
