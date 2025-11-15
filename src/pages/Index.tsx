import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  content: string;
  created_at: string;
}

export default function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  const API_URL = 'https://functions.poehali.dev/1d663839-282d-4657-9b48-3557555e9452';

  const fetchMessages = async () => {
    try {
      const response = await fetch(API_URL);
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
        description: 'Напишите что-нибудь перед отправкой',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        await fetchMessages();
        toast({
          title: 'Отправлено',
          description: 'Ваше сообщение успешно добавлено',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
              Анонимный дашборд
            </h1>
            <p className="text-muted-foreground text-lg font-light">
              Оставьте сообщение — всё остаётся анонимным
            </p>
          </div>

          <Card className="p-6 md:p-8 border-border shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Напишите сообщение..."
                className="min-h-32 resize-none text-base border-input focus-visible:ring-primary"
                disabled={isLoading}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || !newMessage.trim()}
                  className="px-8 font-medium"
                >
                  {isLoading ? (
                    <>
                      <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                      Отправка
                    </>
                  ) : (
                    <>
                      <Icon name="Send" className="mr-2 h-4 w-4" />
                      Отправить
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-light text-foreground">
                Все сообщения
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMessages}
                disabled={isFetching}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon 
                  name="RefreshCw" 
                  className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} 
                />
              </Button>
            </div>

            {isFetching ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 border-border">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <Card className="p-12 border-border border-dashed">
                <div className="text-center space-y-2">
                  <Icon name="MessageSquare" className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground font-light">
                    Пока нет сообщений
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <Card
                    key={message.id}
                    className="p-6 border-border shadow-sm hover:shadow-md transition-shadow duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="space-y-2">
                      <p className="text-foreground leading-relaxed">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon name="Clock" className="h-3 w-3" />
                        {formatDate(message.created_at)}
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