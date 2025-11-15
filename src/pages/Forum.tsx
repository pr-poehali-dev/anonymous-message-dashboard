import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { isAuthenticated, getCurrentUser, clearAuth } from '@/lib/auth';

interface Topic {
  id: number;
  title: string;
  created_at: string;
  user: {
    id: number;
    username: string;
  };
  message_count: number;
  last_activity: string;
}

export default function Forum() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const API_URL = 'https://functions.poehali.dev/f72e1beb-bf18-4b13-9183-53476aadff80';

  const fetchTopics = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить темы',
        variant: 'destructive'
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTopicTitle.trim()) {
      toast({
        title: 'Пустое название',
        description: 'Введите название темы',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('forum_auth');
      const authData = token ? JSON.parse(token) : null;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': authData?.token || 'guest'
        },
        body: JSON.stringify({ title: newTopicTitle }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewTopicTitle('');
        setShowNewTopic(false);
        await fetchTopics();
        toast({
          title: 'Тема создана',
          description: 'Новая тема успешно добавлена',
        });
        navigate(`/topic/${data.topic.id}`);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать тему',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchTopics();
  }, [navigate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-light">Форум</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {currentUser ? getInitials(currentUser.username) : 'U'}
              </div>
              <span className="text-sm text-foreground">{currentUser?.username}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <Icon name="LogOut" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-light text-foreground">Все темы</h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTopics}
                disabled={isFetching}
              >
                <Icon 
                  name="RefreshCw" 
                  className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} 
                />
              </Button>
              <Button onClick={() => setShowNewTopic(!showNewTopic)}>
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Новая тема
              </Button>
            </div>
          </div>

          {showNewTopic && (
            <Card className="p-6 animate-fade-in">
              <form onSubmit={handleCreateTopic} className="space-y-4">
                <Input
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Название темы..."
                  disabled={isLoading}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowNewTopic(false)}
                    disabled={isLoading}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Создание...' : 'Создать'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {isFetching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : topics.length === 0 ? (
            <Card className="p-12 border-dashed">
              <div className="text-center space-y-2">
                <Icon name="MessageSquare" className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-muted-foreground font-light">
                  Пока нет тем. Создайте первую!
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {topics.map((topic, index) => (
                <Card
                  key={topic.id}
                  className="p-6 hover:shadow-md transition-all duration-200 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                      {getInitials(topic.user.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-foreground mb-1">
                        {topic.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon name="User" className="h-3 w-3" />
                          {topic.user.username}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="MessageCircle" className="h-3 w-3" />
                          {topic.message_count} ответов
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Clock" className="h-3 w-3" />
                          {formatDate(topic.last_activity)}
                        </span>
                      </div>
                    </div>
                    <Icon name="ChevronRight" className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
