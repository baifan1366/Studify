'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface MembersTabProps {
  membersData: any;
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  classroom?: any;
}

export function MembersTab({ membersData, isOwnerOrTutor, classroomSlug, navigateToSection, classroom }: MembersTabProps) {
  const t = useTranslations('MembersTab');
  
  // Get classroom color
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');
  
  return (
    <Card 
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('classroom_members')}</CardTitle>
          <CardDescription>{t('manage_members_description')}</CardDescription>
        </div>
        {isOwnerOrTutor && (
          <Button onClick={() => navigateToSection('members')}>
            <Settings className="h-4 w-4 mr-2" />
            {t('manage_members')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {(() => {
          console.log('🔍 Members data in MembersTab:', {
            membersData,
            hasMembers: !!membersData,
            membersArray: membersData?.length ? membersData : membersData?.members,
            memberCount: membersData?.length || membersData?.members?.length || 0
          });
          
          // Handle both array format and object format
          const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
          
          return members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('no_members_yet')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('share_class_code_invite')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member: any, index: number) => {
                console.log('🔍 Rendering member:', member);
                return (
                  <div key={member.id || member.user_id || `member-${index}`} className="flex items-center justify-between p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>
                          {(member.display_name || member.name)?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.display_name || member.name || t('unknown_user')}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={member.role === 'owner' ? 'default' : member.role === 'tutor' ? 'secondary' : 'outline'}>
                        {member.role}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {t('joined')} {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}