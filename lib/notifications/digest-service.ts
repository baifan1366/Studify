// 学习周报/日报生成和推送服务
import { createClient } from '@supabase/supabase-js';
import { notificationService } from './notification-service';

// 环境变量检查
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables for digest service');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DigestData {
  userId: number;
  period: 'daily' | 'weekly';
  startDate: Date;
  endDate: Date;
  stats: {
    totalStudyTime: number; // 分钟
    lessonsCompleted: number;
    quizzesCompleted: number;
    pointsEarned: number;
    streakDays: number;
    topCourses: Array<{ title: string; progress: number }>;
  };
}

export class DigestService {
  /**
   * 生成用户学习数据摘要
   */
  async generateDigest(userId: number, period: 'daily' | 'weekly'): Promise<DigestData | null> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'daily') {
        startDate.setDate(startDate.getDate() - 1);
      } else {
        startDate.setDate(startDate.getDate() - 7);
      }

      // 获取学习时长
      const { data: progressData } = await supabase
        .from('course_progress')
        .select('time_spent')
        .eq('user_id', userId)
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endDate.toISOString());

      const totalStudyTime = progressData?.reduce((sum, p) => sum + (p.time_spent || 0), 0) || 0;

      // 获取完成的课程数
      const { count: lessonsCompleted } = await supabase
        .from('course_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // 获取完成的测验数
      const { count: quizzesCompleted } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 获取获得的积分
      const { data: pointsData } = await supabase
        .from('point_transactions')
        .select('points')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const pointsEarned = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

      // 获取连续学习天数
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_days')
        .eq('id', userId)
        .single();

      const streakDays = profile?.streak_days || 0;

      // 获取学习最多的课程
      const { data: topCoursesData } = await supabase
        .from('course_progress')
        .select(`
          time_spent,
          progress_percentage,
          course:courses (
            title
          )
        `)
        .eq('user_id', userId)
        .gte('updated_at', startDate.toISOString())
        .order('time_spent', { ascending: false })
        .limit(3);

      const topCourses = topCoursesData?.map((c: any) => ({
        title: c.course?.title || 'Unknown',
        progress: c.progress_percentage || 0
      })) || [];

      return {
        userId,
        period,
        startDate,
        endDate,
        stats: {
          totalStudyTime,
          lessonsCompleted: lessonsCompleted || 0,
          quizzesCompleted: quizzesCompleted || 0,
          pointsEarned,
          streakDays,
          topCourses
        }
      };
    } catch (error) {
      console.error('Error generating digest:', error);
      return null;
    }
  }

  /**
   * 发送日报通知
   */
  async sendDailyDigest(userId: number): Promise<void> {
    try {
      // 检查用户是否启用了日报
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error(`Error fetching profile for user ${userId}:`, profileError);
        return;
      }

      const settings = profile?.notification_settings || {};
      if (settings.daily_digest === false) {
        return;
      }

      const digest = await this.generateDigest(userId, 'daily');
      if (!digest) {
        console.log(`No digest data generated for user ${userId}`);
        return;
      }

      const { stats } = digest;

      // 如果没有任何学习活动，不发送通知
      if (stats.totalStudyTime === 0 && stats.lessonsCompleted === 0 && stats.quizzesCompleted === 0) {
        console.log(`User ${userId} has no learning activity today, skipping digest`);
        return;
      }

      const hours = Math.round(stats.totalStudyTime / 60 * 10) / 10; // 保留一位小数
      const minutes = stats.totalStudyTime % 60;
      const timeText = hours >= 1 
        ? `${hours} 小时${minutes > 0 ? ` ${minutes} 分钟` : ''}`
        : `${minutes} 分钟`;
      
      const title = '📊 今日学习日报';
      const message = `今天你学习了 ${timeText}，完成了 ${stats.lessonsCompleted} 个课程，获得了 ${stats.pointsEarned} 积分！${stats.streakDays > 0 ? `连续学习 ${stats.streakDays} 天 🔥` : ''}`;

      await notificationService.createNotification({
        user_id: userId,
        kind: 'daily_digest',
        payload: {
          period: 'daily',
          stats,
          title,
          message
        },
        title,
        message,
        deep_link: '/dashboard',
        send_push: true
      });

      console.log(`✅ Daily digest sent to user ${userId}`);
    } catch (error) {
      console.error(`Error sending daily digest to user ${userId}:`, error);
      throw error; // 重新抛出错误以便上层处理
    }
  }

  /**
   * 发送周报通知
   */
  async sendWeeklyDigest(userId: number): Promise<void> {
    try {
      // 检查用户是否启用了周报
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('notification_settings, display_name')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error(`Error fetching profile for user ${userId}:`, profileError);
        return;
      }

      const settings = profile?.notification_settings || {};
      if (settings.weekly_digest === false) {
        return;
      }

      const digest = await this.generateDigest(userId, 'weekly');
      if (!digest) {
        console.log(`No digest data generated for user ${userId}`);
        return;
      }

      const { stats } = digest;

      // 如果没有任何学习活动，不发送通知
      if (stats.totalStudyTime === 0 && stats.lessonsCompleted === 0 && stats.quizzesCompleted === 0) {
        console.log(`User ${userId} has no learning activity this week, skipping digest`);
        return;
      }

      const hours = Math.floor(stats.totalStudyTime / 60);
      const minutes = stats.totalStudyTime % 60;
      const timeText = hours >= 1 
        ? `${hours} 小时${minutes > 0 ? ` ${minutes} 分钟` : ''}`
        : `${minutes} 分钟`;
      
      const title = '📈 本周学习周报';
      
      // 构建更详细的消息
      let message = `${profile?.display_name || '同学'}，本周你学习了 ${timeText}`;
      
      if (stats.lessonsCompleted > 0) {
        message += `，完成了 ${stats.lessonsCompleted} 个课程`;
      }
      
      if (stats.quizzesCompleted > 0) {
        message += `，完成了 ${stats.quizzesCompleted} 个测验`;
      }
      
      if (stats.pointsEarned > 0) {
        message += `，获得了 ${stats.pointsEarned} 积分`;
      }
      
      message += '！';
      
      if (stats.streakDays >= 7) {
        message += '恭喜你连续学习一周！🎉';
      } else if (stats.streakDays > 0) {
        message += `已连续学习 ${stats.streakDays} 天，继续保持！💪`;
      }

      await notificationService.createNotification({
        user_id: userId,
        kind: 'weekly_digest',
        payload: {
          period: 'weekly',
          stats,
          title,
          message,
          topCourses: stats.topCourses
        },
        title,
        message,
        deep_link: '/learning-progress',
        send_push: true
      });

      console.log(`✅ Weekly digest sent to user ${userId}`);
    } catch (error) {
      console.error(`Error sending weekly digest to user ${userId}:`, error);
      throw error; // 重新抛出错误以便上层处理
    }
  }

  /**
   * 批量发送日报给所有用户
   * 使用批处理和并发控制提高性能
   */
  async sendDailyDigestToAll(): Promise<{ success: number; failed: number; total: number }> {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('status', 'active')
        .eq('is_deleted', false);

      if (!profiles || profiles.length === 0) {
        console.log('No active users found for daily digest');
        return { success: 0, failed: 0, total: 0 };
      }

      console.log(`📊 Sending daily digest to ${profiles.length} users...`);

      let success = 0;
      let failed = 0;
      const batchSize = 10; // 每批处理 10 个用户
      const batches = [];

      // 分批处理
      for (let i = 0; i < profiles.length; i += batchSize) {
        batches.push(profiles.slice(i, i + batchSize));
      }

      // 并发处理每批
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(profile => this.sendDailyDigest(profile.id))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            success++;
          } else {
            failed++;
            console.error(`Failed to send daily digest to user ${batch[index].id}:`, result.reason);
          }
        });

        // 批次之间稍微延迟，避免过载
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Daily digest completed: ${success} success, ${failed} failed out of ${profiles.length} users`);
      return { success, failed, total: profiles.length };
    } catch (error) {
      console.error('Error sending daily digest to all users:', error);
      return { success: 0, failed: 0, total: 0 };
    }
  }

  /**
   * 批量发送周报给所有用户
   * 使用批处理和并发控制提高性能
   */
  async sendWeeklyDigestToAll(): Promise<{ success: number; failed: number; total: number }> {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('status', 'active')
        .eq('is_deleted', false);

      if (!profiles || profiles.length === 0) {
        console.log('No active users found for weekly digest');
        return { success: 0, failed: 0, total: 0 };
      }

      console.log(`📊 Sending weekly digest to ${profiles.length} users...`);

      let success = 0;
      let failed = 0;
      const batchSize = 10; // 每批处理 10 个用户
      const batches = [];

      // 分批处理
      for (let i = 0; i < profiles.length; i += batchSize) {
        batches.push(profiles.slice(i, i + batchSize));
      }

      // 并发处理每批
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(profile => this.sendWeeklyDigest(profile.id))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            success++;
          } else {
            failed++;
            console.error(`Failed to send weekly digest to user ${batch[index].id}:`, result.reason);
          }
        });

        // 批次之间稍微延迟，避免过载
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Weekly digest completed: ${success} success, ${failed} failed out of ${profiles.length} users`);
      return { success, failed, total: profiles.length };
    } catch (error) {
      console.error('Error sending weekly digest to all users:', error);
      return { success: 0, failed: 0, total: 0 };
    }
  }
}

export const digestService = new DigestService();
