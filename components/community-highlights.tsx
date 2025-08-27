"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  ArrowRight, 
  Plus,
  UserPlus,
  Clock,
  TrendingUp
} from 'lucide-react';

interface CommunityHighlightsProps {
  onCreatePost?: () => void;
  onJoinGroup?: () => void;
}

export default function CommunityHighlights({ onCreatePost, onJoinGroup }: CommunityHighlightsProps) {
  const latestPosts = [
    {
      id: 1,
      author: "Sarah Chen",
      avatar: "/api/placeholder/32/32",
      content: "Just solved a challenging calculus problem! The key was breaking it down into smaller steps. Anyone else working on derivatives?",
      likes: 24,
      comments: 8,
      timeAgo: "2h ago",
      subject: "Math"
    },
    {
      id: 2,
      author: "Alex Rodriguez",
      avatar: "/api/placeholder/32/32",
      content: "Created a mind map for Chemistry bonding concepts. Visual learning really helps! Would love to share study techniques.",
      likes: 18,
      comments: 12,
      timeAgo: "4h ago",
      subject: "Chemistry"
    },
    {
      id: 3,
      author: "Emma Wilson",
      avatar: "/api/placeholder/32/32",
      content: "Looking for study partners for SAT prep. Let's form a group and practice together! 📚",
      likes: 31,
      comments: 15,
      timeAgo: "6h ago",
      subject: "SAT Prep"
    }
  ];

  const studyGroups = [
    {
      id: 1,
      name: "AP Physics Study Group",
      members: 127,
      activity: "Very Active",
      subject: "Physics",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      name: "SAT Math Prep Warriors",
      members: 89,
      activity: "Active",
      subject: "SAT Math",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      name: "Chemistry Lab Partners",
      members: 156,
      activity: "Very Active",
      subject: "Chemistry",
      color: "from-green-500 to-teal-500"
    }
  ];

  return (
    <motion.section
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Learning Community</h2>
            <p className="text-white/70">Connect, share, and learn together</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            onClick={onCreatePost}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              Create Post
            </div>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Posts */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Latest Posts</h3>
          
          {latestPosts.map((post, index) => (
            <motion.div
              key={post.id}
              className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/8 transition-colors cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src={post.avatar} 
                  alt={post.author}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{post.author}</span>
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                      {post.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/50">
                    <Clock size={12} />
                    {post.timeAgo}
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-white/80 text-sm mb-3 line-clamp-2">
                {post.content}
              </p>

              {/* Post Stats */}
              <div className="flex items-center gap-4 text-xs text-white/60">
                <div className="flex items-center gap-1">
                  <Heart size={12} />
                  {post.likes}
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  {post.comments}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Study Groups */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recommended Study Groups</h3>
          
          {studyGroups.map((group, index) => (
            <motion.div
              key={group.id}
              className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/8 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${group.color} rounded-lg flex items-center justify-center`}>
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm">{group.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span>{group.members} members</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={10} />
                        {group.activity}
                      </div>
                    </div>
                  </div>
                </div>
                
                <motion.button
                  onClick={onJoinGroup}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center gap-1">
                    <UserPlus size={12} />
                    Join
                  </div>
                </motion.button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full">
                  {group.subject}
                </span>
                <span className="text-xs text-white/50">
                  {Math.floor(Math.random() * 10) + 1} new posts today
                </span>
              </div>
            </motion.div>
          ))}

          {/* Join Group CTA */}
          <motion.button
            onClick={onJoinGroup}
            className="group w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={20} />
              Explore All Groups
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
