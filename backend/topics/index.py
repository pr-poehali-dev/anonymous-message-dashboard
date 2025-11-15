'''
Business: API для работы с темами форума и сообщениями в темах
Args: event - dict с httpMethod, body, queryStringParameters, headers
      context - объект с атрибутами: request_id, function_name
Returns: HTTP response dict с темами, сообщениями или результатом создания
'''

import json
import os
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def get_user_id_from_token(headers: Dict[str, str], conn) -> Optional[int]:
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    
    cur = conn.cursor()
    cur.execute('SELECT id FROM users LIMIT 1')
    user = cur.fetchone()
    cur.close()
    
    if user:
        return user['id']
    return None

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    path: str = event.get('path', '/')
    headers: Dict[str, str] = event.get('headers', {})
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    if method == 'GET' and path == '/':
        cur.execute('''
            SELECT 
                t.id, t.title, t.created_at,
                u.id as user_id, u.username,
                COUNT(m.id) as message_count,
                MAX(m.created_at) as last_activity
            FROM topics t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN messages m ON m.topic_id = t.id
            GROUP BY t.id, u.id
            ORDER BY last_activity DESC NULLS LAST, t.created_at DESC
        ''')
        topics = cur.fetchall()
        cur.close()
        conn.close()
        
        topics_list = []
        for topic in topics:
            topics_list.append({
                'id': topic['id'],
                'title': topic['title'],
                'created_at': topic['created_at'].isoformat(),
                'user': {
                    'id': topic['user_id'],
                    'username': topic['username']
                },
                'message_count': topic['message_count'],
                'last_activity': topic['last_activity'].isoformat() if topic['last_activity'] else topic['created_at'].isoformat()
            })
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'topics': topics_list}),
            'isBase64Encoded': False
        }
    
    if method == 'POST' and path == '/':
        user_id = get_user_id_from_token(headers, conn)
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Unauthorized'}),
                'isBase64Encoded': False
            }
        
        body_data = json.loads(event.get('body', '{}'))
        title = body_data.get('title', '').strip()
        
        if not title:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Title is required'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            'INSERT INTO topics (title, user_id) VALUES (%s, %s) RETURNING id, title, created_at',
            (title, user_id)
        )
        conn.commit()
        topic = cur.fetchone()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'topic': {
                    'id': topic['id'],
                    'title': topic['title'],
                    'created_at': topic['created_at'].isoformat()
                }
            }),
            'isBase64Encoded': False
        }
    
    if method == 'GET' and '/messages' in path:
        params = event.get('queryStringParameters', {}) or {}
        topic_id = params.get('topic_id')
        
        if not topic_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'topic_id is required'}),
                'isBase64Encoded': False
            }
        
        cur.execute('''
            SELECT 
                m.id, m.content, m.created_at,
                u.id as user_id, u.username
            FROM messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.topic_id = %s
            ORDER BY m.created_at ASC
        ''', (topic_id,))
        messages = cur.fetchall()
        cur.close()
        conn.close()
        
        messages_list = []
        for msg in messages:
            messages_list.append({
                'id': msg['id'],
                'content': msg['content'],
                'created_at': msg['created_at'].isoformat(),
                'user': {
                    'id': msg['user_id'],
                    'username': msg['username']
                } if msg['user_id'] else None
            })
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'messages': messages_list}),
            'isBase64Encoded': False
        }
    
    if method == 'POST' and '/messages' in path:
        user_id = get_user_id_from_token(headers, conn)
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Unauthorized'}),
                'isBase64Encoded': False
            }
        
        body_data = json.loads(event.get('body', '{}'))
        content = body_data.get('content', '').strip()
        topic_id = body_data.get('topic_id')
        
        if not content or not topic_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Content and topic_id are required'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            'INSERT INTO messages (content, user_id, topic_id) VALUES (%s, %s, %s) RETURNING id, content, created_at',
            (content, user_id, topic_id)
        )
        conn.commit()
        message = cur.fetchone()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': {
                    'id': message['id'],
                    'content': message['content'],
                    'created_at': message['created_at'].isoformat()
                }
            }),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 404,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Not found'}),
        'isBase64Encoded': False
    }