"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Share2, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Users,
  Trash2,
  Plus
} from "lucide-react";
import { apiGet, apiSend } from "@/lib/api-config";
import { toast } from "sonner";

interface InviteLink {
  token: string;
  invite_link: string;
  permission_type: 'view' | 'attempt' | 'edit';
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
  created_at: string;
}

interface ShareQuizModalProps {
  quizSlug: string;
  quizTitle: string;
  isAuthor: boolean;
  visibility: 'public' | 'private';
  children: React.ReactNode;
}

export default function ShareQuizModal({ 
  quizSlug, 
  quizTitle, 
  isAuthor, 
  visibility,
  children 
}: ShareQuizModalProps) {
  const [open, setOpen] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新邀请表单状态
  const [permissionType, setPermissionType] = useState<'view' | 'attempt' | 'edit'>('attempt');
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [maxUses, setMaxUses] = useState<string>('');

  const fetchInviteLinks = async () => {
    if (!isAuthor) return;
    
    try {
      setLoading(true);
      const links = await apiGet<InviteLink[]>(`/api/community/quizzes/${quizSlug}/share`);
      setInviteLinks(links);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load invite links");
    } finally {
      setLoading(false);
    }
  };

  const createInviteLink = async () => {
    try {
      setCreating(true);
      const payload: any = {
        permission_type: permissionType
      };

      if (expiresInDays) {
        payload.expires_in_days = parseInt(expiresInDays);
      }

      if (maxUses) {
        payload.max_uses = parseInt(maxUses);
      }

      const response = await apiSend<{
        invite_link: string;
        token: string;
        expires_at?: string;
        permission_type: string;
      }>({
        url: `/api/community/quizzes/${quizSlug}/share`,
        method: "POST",
        body: payload
      });

      // 重新获取邀请链接列表
      await fetchInviteLinks();

      // 重置表单
      setPermissionType('attempt');
      setExpiresInDays('');
      setMaxUses('');

      toast.success("Invite link created successfully!");

    } catch (err: any) {
      setError(err.message || "Failed to create invite link");
      toast.error("Failed to create invite link");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const getPermissionLabel = (type: string) => {
    switch (type) {
      case 'view': return 'View';
      case 'attempt': return 'Attempt';
      case 'edit': return 'Edit';
      default: return type;
    }
  };

  const getPermissionColor = (type: string) => {
    switch (type) {
      case 'view': return 'bg-blue-100 text-blue-800';
      case 'attempt': return 'bg-green-100 text-green-800';
      case 'edit': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && (isAuthor || children)) {
      fetchInviteLinks();
    }
  };

  // 撤销邀请链接
  const revokeInviteLink = async (token: string) => {
    try {
      await apiSend<{ success: boolean }>({
        url: `/api/community/quizzes/${quizSlug}/share?token=${token}`,
        method: 'DELETE',
      });
      toast.success('Invite link revoked');
      await fetchInviteLinks();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke link');
    }
  };

  // 公开测验分享链接
  const publicShareUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/community/quizzes/${quizSlug}`;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/community/quizzes/${quizSlug}`;
  }, [quizSlug]);

  // 如果不是作者且没有传入children，则不显示
  if (!isAuthor && !children) {
    return null;
  }

  // 如果是公开测验，显示简化的分享 Modal
  if (visibility === 'public') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share this public quiz
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              This is a public quiz. Anyone with the link can view and participate.
            </div>
            <div className="flex items-center gap-2">
              <Input value={publicShareUrl} readOnly className="text-sm" />
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(publicShareUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 私有测验显示完整的 modal
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{quizTitle}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 创建新邀请链接 */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Invite Link
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Permission Type</Label>
                <Select value={permissionType} onValueChange={(value: any) => setPermissionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="attempt">Can Attempt</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Expires In (Days)</Label>
                <Input
                  type="number"
                  placeholder="Never expires"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <Button 
              onClick={createInviteLink} 
              disabled={creating}
              className="w-full"
            >
              {creating ? "Creating..." : "Create Invite Link"}
            </Button>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* 现有邀请链接列表 */}
          <div>
            <h3 className="font-semibold mb-3">Active Invite Links</h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : inviteLinks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No invite links created yet
              </p>
            ) : (
              <div className="space-y-3">
                {inviteLinks.map((link) => (
                  <div key={link.token} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getPermissionColor(link.permission_type)}>
                          {getPermissionLabel(link.permission_type)}
                        </Badge>
                        
                        {link.expires_at && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires {new Date(link.expires_at).toLocaleDateString()}
                          </Badge>
                        )}
                        
                        {link.max_uses && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {link.current_uses}/{link.max_uses} uses
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={link.invite_link}
                        readOnly
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link.invite_link)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => revokeInviteLink(link.token)}
                        title="Revoke link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created {new Date(link.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
