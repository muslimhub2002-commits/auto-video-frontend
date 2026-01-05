'use client';

import { Button } from '@/components/ui/button';
import { Plus, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/auth';

interface SidebarProps {
  user: User | null;
  isOpen: boolean;
  onLogout: () => void;
  onNewGeneration: () => void;
  onSelectChat: (chatId: string | null) => void;
  activeChatId: string | null;
}

interface ChatSummary {
  id: string;
  title: string | null;
  created_at: string;
}

// Simple in-memory cache so we only hit the chats API once
// per user during the app lifetime (except when explicitly
// loading more pages).
let cachedChats: ChatSummary[] | null = null;
let cachedPage = 1;
let cachedHasMore = true;
let cachedUserId: string | null = null;

export function Sidebar({ user, isOpen, onLogout, onNewGeneration, onSelectChat, activeChatId }: SidebarProps) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChats = async (pageToLoad = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get<{ items: ChatSummary[]; total: number; page: number; limit: number }>(
        '/chats',
        { params: { page: pageToLoad, limit: 20 } },
      );
      const data = res.data;
      if (pageToLoad === 1) {
        const items = data.items || [];
        setChats(items);
        cachedChats = items;
      } else {
        setChats((prev) => {
          const merged = [...prev, ...(data.items || [])];
          cachedChats = merged;
          return merged;
        });
      }
      setPage(data.page);
      cachedPage = data.page;
      const loadedCount = (data.page - 1) * data.limit + data.items.length;
      const more = loadedCount < data.total;
      setHasMore(more);
      cachedHasMore = more;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load chats', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // If we already have chats cached for this user, reuse them
    if (cachedChats && cachedUserId === user.id) {
      setChats(cachedChats);
      setPage(cachedPage);
      setHasMore(cachedHasMore);
      return;
    }

    cachedUserId = user.id;
    fetchChats(1);
  }, [user]);

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
  };
  return (
    <div
      className={`${isOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden`}
    >
      <div className="p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-gray-900 hover:bg-gray-200"
          onClick={onNewGeneration}
        >
          <Plus className="h-4 w-4" />
          New Generation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs text-gray-500 px-3 py-2">Chats</div>
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => handleSelectChat(chat.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 truncate ${
                activeChatId === chat.id
                  ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                  : 'bg-transparent hover:bg-gray-200 text-gray-700'
              }`}
            >
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="truncate">{chat.title || 'Untitled Chat'}</span>
            </button>
          ))}
          {isLoading && (
            <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>
          )}
          {!isLoading && hasMore && (
            <button
              type="button"
              onClick={() => fetchChats(page + 1)}
              className="w-full text-left px-3 py-2 text-xs rounded-md text-blue-600 hover:bg-blue-50"
            >
              Load more
            </button>
          )}
          {!isLoading && chats.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              No chats yet. Generate and save a video to get started.
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-semibold">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
