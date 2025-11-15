import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';

interface Message {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: number;
    username: string;
  } | null;
}

export default function Topic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  const API_URL = 'https://functions.poehali.dev/f72e1beb-bf18-4b13-9183-53476aadff80';

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/messages?topic_id=${id}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить сообщения',
        variant: 'destructive'
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      toast({
        title: 'Пустое сообщение',
        description: 'Напишите что-нибудь',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('forum_auth');
      const authData = token ? JSON.parse(token) : null;

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': authData?.token || 'guest'
        },
        body: JSON.stringify({ 
          content: newMessage,
          topic_id: parseInt(id || '0')
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await fetchMessages();
        toast({
          title: 'Отправлено',
          description: 'Сообщение добавлено',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить',
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
    fetchMessages();
  }, [id, navigate]);

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

  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/forum')} className="mb-2">
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Назад к темам
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <Card className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ваш ответ..."
                className="min-h-32 resize-none"
                disabled={isLoading}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Отправка...' : 'Ответить'}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-light">
                {messages.length} {messages.length === 1 ? 'сообщение' : 'сообщений'}
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchMessages} disabled={isFetching}>
                <Icon 
                  name="RefreshCw" 
                  className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} 
                />
              </Button>
            </div>

            {isFetching ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <Card className="p-12 border-dashed">
                <div className="text-center space-y-2">
                  <Icon name="MessageSquare" className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground font-light">
                    Пока нет сообщений. Будьте первым!
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <Card
                    key={message.id}
                    className="p-6 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                        {message.user ? getInitials(message.user.username) : '?'}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {message.user?.username || 'Аноним'}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Icon name="Clock" className="h-3 w-3" />
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p className="text-foreground leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
