import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Users, 
  MessageCircle, 
  Bell, 
  Settings,
  Copy,
  Link,
  Mail,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  Plus,
  Search
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';

interface CollaborationProps {
  selectedProperty?: any;
  elevationData?: { distances: number[]; elevations: number[] };
  measurements?: any[];
}

interface SharedSession {
  id: string;
  title: string;
  description: string;
  url: string;
  createdAt: Date;
  expiresAt?: Date;
  permissions: 'view' | 'edit' | 'admin';
  participants: number;
  isActive: boolean;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  position?: [number, number];
  resolved: boolean;
}

export const CollaborationFeatures: React.FC<CollaborationProps> = ({
  selectedProperty,
  elevationData,
  measurements = []
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'comments' | 'sessions' | 'notifications'>('share');
  const [sharedSessions, setSharedSessions] = useState<SharedSession[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', message: 'New comment on Property A', timestamp: new Date(), read: false },
    { id: '2', message: 'Session shared with team', timestamp: new Date(), read: false },
  ]);

  const tabs = [
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'comments', label: 'Comments', icon: MessageCircle },
    { id: 'sessions', label: 'Sessions', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const generateShareLink = async () => {
    setIsGeneratingLink(true);
    
    // Simulate API call
    setTimeout(() => {
      const linkId = Math.random().toString(36).substring(7);
      const url = `${window.location.origin}/shared/${linkId}`;
      setShareUrl(url);
      setIsGeneratingLink(false);
      
      // Add to shared sessions
      const newSession: SharedSession = {
        id: linkId,
        title: `Property Analysis - ${new Date().toLocaleDateString()}`,
        description: 'Shared property boundary analysis',
        url,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        permissions: 'view',
        participants: 0,
        isActive: true,
      };
      
      setSharedSessions(prev => [newSession, ...prev]);
    }, 1000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success feedback
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: `comment_${Date.now()}`,
      text: newComment,
      author: 'You',
      timestamp: new Date(),
      resolved: false,
    };
    
    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const resolveComment = (commentId: string) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, resolved: !comment.resolved }
          : comment
      )
    );
  };

  const deleteComment = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  };

  const exportSession = () => {
    const sessionData = {
      property: selectedProperty,
      elevationData,
      measurements,
      comments,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `property-session-${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const importSession = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            // Process imported data
            console.log('Imported session:', data);
          } catch (error) {
            console.error('Error importing session:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <EnhancedCard
      title="Collaboration"
      subtitle="Share and collaborate on property analysis"
      icon={Users}
      variant="elevated"
    >
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        padding: '4px',
      }}>
        {tabs.map(tab => (
          <EnhancedButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            size="sm"
            icon={tab.icon}
            style={{ borderRadius: '6px', flex: 1 }}
          >
            {tab.label}
          </EnhancedButton>
        ))}
      </div>

      {/* Share Tab */}
      {activeTab === 'share' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Share Property Analysis
          </h4>
          
          {!shareUrl ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Share2 size={48} color="#6b7280" />
              <p style={{ marginTop: '12px', color: '#6b7280' }}>
                Generate a shareable link for this property analysis
              </p>
              <EnhancedButton
                onClick={generateShareLink}
                loading={isGeneratingLink}
                variant="primary"
                size="md"
                icon={Link}
                style={{ marginTop: '16px' }}
              >
                {isGeneratingLink ? 'Generating...' : 'Generate Share Link'}
              </EnhancedButton>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Check size={16} color="#0ea5e9" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
                  Share Link Generated
                </span>
              </div>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#374151',
                marginBottom: '12px',
                wordBreak: 'break-all',
              }}>
                {shareUrl}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <EnhancedButton
                  onClick={() => copyToClipboard(shareUrl)}
                  variant="secondary"
                  size="sm"
                  icon={Copy}
                >
                  Copy Link
                </EnhancedButton>
                <EnhancedButton
                  onClick={() => window.open(shareUrl, '_blank')}
                  variant="secondary"
                  size="sm"
                  icon={Eye}
                >
                  Preview
                </EnhancedButton>
              </div>
            </div>
          )}

          {/* Export/Import */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <EnhancedButton
              onClick={exportSession}
              variant="secondary"
              size="sm"
              icon={Download}
              fullWidth
            >
              Export Session
            </EnhancedButton>
            <EnhancedButton
              onClick={importSession}
              variant="secondary"
              size="sm"
              icon={Upload}
              fullWidth
            >
              Import Session
            </EnhancedButton>
          </div>
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Comments & Notes
          </h4>
          
          {/* Add Comment */}
          <div style={{ marginBottom: '16px' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or note about this property..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <EnhancedButton
                onClick={addComment}
                disabled={!newComment.trim()}
                variant="primary"
                size="sm"
                icon={Plus}
              >
                Add Comment
              </EnhancedButton>
            </div>
          </div>

          {/* Comments List */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                <MessageCircle size={48} />
                <p style={{ marginTop: '12px' }}>No comments yet</p>
              </div>
            ) : (
              comments.map(comment => (
                <div
                  key={comment.id}
                  style={{
                    backgroundColor: comment.resolved ? '#f0fdf4' : '#f9fafb',
                    border: `1px solid ${comment.resolved ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                        {comment.author}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                        {comment.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <EnhancedButton
                        onClick={() => resolveComment(comment.id)}
                        variant={comment.resolved ? 'success' : 'ghost'}
                        size="sm"
                        icon={Check}
                        style={{ padding: '4px' }}
                      />
                      <EnhancedButton
                        onClick={() => deleteComment(comment.id)}
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        style={{ padding: '4px' }}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#111827', margin: 0 }}>
                    {comment.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Shared Sessions
          </h4>
          
          {sharedSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <Users size={48} />
              <p style={{ marginTop: '12px' }}>No shared sessions yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {sharedSessions.map(session => (
                <div
                  key={session.id}
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                        {session.title}
                      </h5>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        {session.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <EnhancedButton
                        onClick={() => copyToClipboard(session.url)}
                        variant="ghost"
                        size="sm"
                        icon={Copy}
                        style={{ padding: '4px' }}
                      />
                      <EnhancedButton
                        onClick={() => window.open(session.url, '_blank')}
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        style={{ padding: '4px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
                    <span>{session.participants} participants</span>
                    <span>{session.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Notifications
          </h4>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  backgroundColor: notification.read ? '#f9fafb' : '#eff6ff',
                  border: `1px solid ${notification.read ? '#e5e7eb' : '#bfdbfe'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                  );
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#111827', margin: '0 0 4px 0' }}>
                      {notification.message}
                    </p>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {notification.timestamp.toLocaleString()}
                    </span>
                  </div>
                  {!notification.read && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%',
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </EnhancedCard>
  );
};
