// app/api/admin/maintenance/feature-flags/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import redis from '@/utils/redis/redis';

// Feature flags configuration
const DEFAULT_FEATURES = {
  'video_processing': {
    name: 'Video Processing',
    description: 'Enable/disable video upload and processing',
    enabled: true,
    category: 'core',
    environments: ['development', 'staging', 'production']
  },
  'ai_recommendations': {
    name: 'AI Recommendations',
    description: 'Enable/disable AI-powered course and content recommendations',
    enabled: true,
    category: 'ai',
    environments: ['development', 'staging', 'production']
  },
  'embedding_search': {
    name: 'Embedding Search',
    description: 'Enable/disable semantic search using embeddings',
    enabled: true,
    category: 'search',
    environments: ['development', 'staging', 'production']
  },
  'live_sessions': {
    name: 'Live Sessions',
    description: 'Enable/disable live classroom sessions',
    enabled: true,
    category: 'classroom',
    environments: ['staging', 'production']
  },
  'community_groups': {
    name: 'Community Groups',
    description: 'Enable/disable community group functionality',
    enabled: true,
    category: 'community',
    environments: ['development', 'staging', 'production']
  },
  'course_marketplace': {
    name: 'Course Marketplace',
    description: 'Enable/disable course purchase and marketplace features',
    enabled: true,
    category: 'commerce',
    environments: ['production']
  },
  'ai_content_moderation': {
    name: 'AI Content Moderation',
    description: 'Enable/disable automated content moderation',
    enabled: false,
    category: 'moderation',
    environments: ['staging', 'production']
  },
  'advanced_analytics': {
    name: 'Advanced Analytics',
    description: 'Enable/disable detailed analytics and reporting',
    enabled: true,
    category: 'analytics',
    environments: ['production']
  },
  'mobile_app_integration': {
    name: 'Mobile App Integration',
    description: 'Enable/disable mobile app specific features',
    enabled: false,
    category: 'mobile',
    environments: ['staging', 'production']
  },
  'experimental_ui': {
    name: 'Experimental UI',
    description: 'Enable/disable new experimental user interface features',
    enabled: false,
    category: 'ui',
    environments: ['development', 'staging']
  }
};

// GET /api/admin/maintenance/feature-flags - Get all feature flags
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const environment = searchParams.get('environment') || process.env.NODE_ENV || 'development';

    // Get feature flags from Redis cache
    let features = {} as any;
    try {
      const cachedFeatures = await redis.get('feature_flags:all');
      if (cachedFeatures) {
        features = typeof cachedFeatures === 'string' 
          ? JSON.parse(cachedFeatures) 
          : cachedFeatures;
      } else {
        // Initialize with defaults if not cached
        features = DEFAULT_FEATURES;
        await redis.set('feature_flags:all', JSON.stringify(features), { ex: 3600 });
      }
    } catch (redisError) {
      console.warn('Redis error, using defaults:', redisError);
      features = DEFAULT_FEATURES;
    }

    // Filter by category if specified
    if (category) {
      features = Object.entries(features).reduce((acc, [key, feature]) => {
        if ((feature as any).category === category) {
          acc[key] = feature;
        }
        return acc;
      }, {} as any);
    }

    // Filter by environment availability
    const environmentFeatures = Object.entries(features).reduce((acc, [key, feature]) => {
      const featureData = feature as any;
      if (featureData.environments?.includes(environment)) {
        acc[key] = {
          ...featureData,
          currentEnvironment: environment,
          isAvailable: true
        };
      } else {
        acc[key] = {
          ...featureData,
          currentEnvironment: environment,
          isAvailable: false,
          enabled: false // Force disabled if not available in current environment
        };
      }
      return acc;
    }, {} as any);

    // Get usage statistics
    const usageStats = {} as any;
    for (const flagKey of Object.keys(environmentFeatures)) {
      try {
        const usageCount = await redis.get(`feature_usage:${flagKey}`);
        usageStats[flagKey] = parseInt((usageCount as string) || '0');
      } catch (error) {
        usageStats[flagKey] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        features: environmentFeatures,
        usageStats,
        environment,
        categories: [...new Set(Object.values(environmentFeatures).map((f: any) => f.category))],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Feature flags API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/maintenance/feature-flags - Update feature flags
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, flagKey, enabled, features, environment } = body;

    const currentEnv = environment || process.env.NODE_ENV || 'development';

    // Get current features
    let currentFeatures = {} as any;
    try {
      const cachedFeatures = await redis.get('feature_flags:all');
      currentFeatures = cachedFeatures 
        ? (typeof cachedFeatures === 'string' ? JSON.parse(cachedFeatures) : cachedFeatures)
        : DEFAULT_FEATURES;
    } catch (error) {
      currentFeatures = DEFAULT_FEATURES;
    }

    const supabase = await createAdminClient();

    switch (action) {
      case 'toggle_flag':
        if (!flagKey || typeof enabled !== 'boolean') {
          return NextResponse.json(
            { message: 'Flag key and enabled status are required' },
            { status: 400 }
          );
        }

        if (!currentFeatures[flagKey]) {
          return NextResponse.json(
            { message: 'Feature flag not found' },
            { status: 404 }
          );
        }

        // Check if feature is available in current environment
        if (!currentFeatures[flagKey].environments?.includes(currentEnv)) {
          return NextResponse.json(
            { message: `Feature "${flagKey}" is not available in ${currentEnv} environment` },
            { status: 400 }
          );
        }

        currentFeatures[flagKey].enabled = enabled;
        currentFeatures[flagKey].lastModified = new Date().toISOString();
        currentFeatures[flagKey].modifiedBy = authResult.user.email;

        // Update cache
        await redis.set('feature_flags:all', JSON.stringify(currentFeatures), { ex: 3600 });

        // Log the change
        await supabase.from('audit_log').insert({
          actor_id: authResult.user.profile?.id,
          action: 'feature_flag_toggle',
          subject_type: 'feature_flag',
          subject_id: flagKey,
          meta: {
            enabled,
            environment: currentEnv,
            previous_state: !enabled
          }
        });

        return NextResponse.json({
          success: true,
          message: `Feature "${flagKey}" ${enabled ? 'enabled' : 'disabled'}`
        });

      case 'bulk_update':
        if (!features || typeof features !== 'object') {
          return NextResponse.json(
            { message: 'Features object is required for bulk update' },
            { status: 400 }
          );
        }

        const updatedFeatures = { ...currentFeatures };
        const changes = [] as any[];

        for (const [key, value] of Object.entries(features)) {
          if (updatedFeatures[key] && typeof value === 'object') {
            const featureUpdate = value as any;
            if (typeof featureUpdate.enabled === 'boolean') {
              // Check environment availability
              if (updatedFeatures[key].environments?.includes(currentEnv)) {
                const previousState = updatedFeatures[key].enabled;
                updatedFeatures[key].enabled = featureUpdate.enabled;
                updatedFeatures[key].lastModified = new Date().toISOString();
                updatedFeatures[key].modifiedBy = authResult.user.email;
                
                changes.push({
                  key,
                  enabled: featureUpdate.enabled,
                  previousState
                });
              }
            }
          }
        }

        // Update cache
        await redis.set('feature_flags:all', JSON.stringify(updatedFeatures), { ex: 3600 });

        // Log bulk changes
        if (changes.length > 0) {
          await supabase.from('audit_log').insert({
            actor_id: authResult.user.profile?.id,
            action: 'feature_flags_bulk_update',
            subject_type: 'feature_flags',
            subject_id: 'bulk_operation',
            meta: {
              changes,
              environment: currentEnv,
              count: changes.length
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: `${changes.length} feature flags updated`,
          changes
        });

      case 'reset_to_defaults':
        // Reset all flags to default values
        const defaultsForEnv = Object.entries(DEFAULT_FEATURES).reduce((acc, [key, feature]) => {
          acc[key] = {
            ...feature,
            lastModified: new Date().toISOString(),
            modifiedBy: authResult.user.email
          };
          return acc;
        }, {} as any);

        await redis.set('feature_flags:all', JSON.stringify(defaultsForEnv), { ex: 3600 });

        // Log reset
        await supabase.from('audit_log').insert({
          actor_id: authResult.user.profile?.id,
          action: 'feature_flags_reset',
          subject_type: 'feature_flags',
          subject_id: 'reset_operation',
          meta: {
            environment: currentEnv,
            reset_count: Object.keys(defaultsForEnv).length
          }
        });

        return NextResponse.json({
          success: true,
          message: 'All feature flags reset to default values'
        });

      case 'create_flag':
        const { name, description, category, environments } = body;
        
        if (!flagKey || !name || !description) {
          return NextResponse.json(
            { message: 'Flag key, name, and description are required' },
            { status: 400 }
          );
        }

        if (currentFeatures[flagKey]) {
          return NextResponse.json(
            { message: 'Feature flag already exists' },
            { status: 400 }
          );
        }

        currentFeatures[flagKey] = {
          name,
          description,
          enabled: false,
          category: category || 'custom',
          environments: environments || ['development', 'staging', 'production'],
          created: new Date().toISOString(),
          createdBy: authResult.user.email
        };

        await redis.set('feature_flags:all', JSON.stringify(currentFeatures), { ex: 3600 });

        // Log creation
        await supabase.from('audit_log').insert({
          actor_id: authResult.user.profile?.id,
          action: 'feature_flag_create',
          subject_type: 'feature_flag',
          subject_id: flagKey,
          meta: { name, description, category, environments }
        });

        return NextResponse.json({
          success: true,
          message: `Feature flag "${flagKey}" created`
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Feature flags operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform feature flag operation' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/maintenance/feature-flags - Delete feature flag
export async function DELETE(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const flagKey = searchParams.get('flag');

    if (!flagKey) {
      return NextResponse.json(
        { message: 'Flag key is required' },
        { status: 400 }
      );
    }

    // Get current features
    let currentFeatures = {} as any;
    try {
      const cachedFeatures = await redis.get('feature_flags:all');
      currentFeatures = cachedFeatures 
        ? (typeof cachedFeatures === 'string' ? JSON.parse(cachedFeatures) : cachedFeatures)
        : DEFAULT_FEATURES;
    } catch (error) {
      currentFeatures = DEFAULT_FEATURES;
    }

    if (!currentFeatures[flagKey]) {
      return NextResponse.json(
        { message: 'Feature flag not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of default flags
    if ((DEFAULT_FEATURES as any)[flagKey]) {
      return NextResponse.json(
        { message: 'Cannot delete default feature flags' },
        { status: 400 }
      );
    }

    const deletedFlag = currentFeatures[flagKey];
    delete currentFeatures[flagKey];

    // Update cache
    await redis.set('feature_flags:all', JSON.stringify(currentFeatures), { ex: 3600 });

    // Clear usage stats
    await redis.del(`feature_usage:${flagKey}`);

    // Log deletion
    const supabase = await createAdminClient();
    await supabase.from('audit_log').insert({
      actor_id: authResult.user.profile?.id,
      action: 'feature_flag_delete',
      subject_type: 'feature_flag',
      subject_id: flagKey,
      meta: { deletedFlag }
    });

    return NextResponse.json({
      success: true,
      message: `Feature flag "${flagKey}" deleted`
    });

  } catch (error) {
    console.error('Feature flag deletion error:', error);
    return NextResponse.json(
      { message: 'Failed to delete feature flag' },
      { status: 500 }
    );
  }
}
