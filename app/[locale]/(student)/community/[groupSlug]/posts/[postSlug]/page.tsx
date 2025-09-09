import React from 'react';
import PostDetailClient from '@/components/community/post-detail-client';

/**
 * @description 文章详情页面 - 服务器组件，使用客户端组件包装器
 * @param params - 包含 groupSlug 和 postSlug 的路由参数
 */
export default async function PostDetailPage({ params }: { params: Promise<{ groupSlug: string, postSlug: string }> }) {
    const { groupSlug, postSlug } = await params;

    return <PostDetailClient groupSlug={groupSlug} postSlug={postSlug} />;
}