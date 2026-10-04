import sqlite3
import os

from backend.config import DB_PATH

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Table: players
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Table: scores
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            game_name TEXT NOT NULL,
            score INTEGER NOT NULL,
            coins INTEGER DEFAULT 0,
            distance INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Table: game_sessions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            game_name TEXT NOT NULL,
            duration_seconds INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def save_score(player_name: str, game_name: str, score: int, coins: int = 0, distance: int = 0):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure player exists
    cursor.execute("INSERT OR IGNORE INTO players (name) VALUES (?)", (player_name,))
    
    # Insert score
    cursor.execute("""
        INSERT INTO scores (player_name, game_name, score, coins, distance)
        VALUES (?, ?, ?, ?, ?)
    """, (player_name, game_name, score, coins, distance))
    
    conn.commit()
    score_id = cursor.lastrowid
    conn.close()
    return score_id

def get_leaderboard(game_name: str = None, limit: int = 10):
    conn = get_connection()
    cursor = conn.cursor()
    
    if game_name and game_name.lower() != "all":
        cursor.execute("""
            SELECT id, player_name, game_name, score, coins, distance, created_at
            FROM scores
            WHERE LOWER(game_name) = LOWER(?)
            ORDER BY score DESC
            LIMIT ?
        """, (game_name, limit))
    else:
        cursor.execute("""
            SELECT id, player_name, game_name, score, coins, distance, created_at
            FROM scores
            ORDER BY score DESC
            LIMIT ?
        """, (limit,))
        
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_player_scores(player_name: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, player_name, game_name, score, coins, distance, created_at
        FROM scores
        WHERE LOWER(player_name) = LOWER(?)
        ORDER BY created_at DESC
    """, (player_name,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
