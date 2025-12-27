"""SQLite 数据访问层。"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import List, Optional


class ResultRepository:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS detection_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    target TEXT NOT NULL,
                    center_x REAL NOT NULL,
                    center_y REAL NOT NULL,
                    confidence REAL NOT NULL,
                    file_hash TEXT,
                    annotated_image TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            self._ensure_columns(conn)

    def _ensure_columns(self, conn: sqlite3.Connection) -> None:
        cursor = conn.execute("PRAGMA table_info(detection_results)")
        columns = {row[1] for row in cursor.fetchall()}
        if "file_hash" not in columns:
            conn.execute("ALTER TABLE detection_results ADD COLUMN file_hash TEXT")
        if "annotated_image" not in columns:
            conn.execute("ALTER TABLE detection_results ADD COLUMN annotated_image TEXT")

    def insert_result(
        self,
        filename: str,
        target: str,
        center_x: float,
        center_y: float,
        confidence: float,
        file_hash: str,
        annotated_image: Optional[str],
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO detection_results (
                    filename,
                    target,
                    center_x,
                    center_y,
                    confidence,
                    file_hash,
                    annotated_image
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    filename,
                    target,
                    center_x,
                    center_y,
                    confidence,
                    file_hash,
                    annotated_image,
                ),
            )

    def get_results_by_hash(self, file_hash: str) -> List[sqlite3.Row]:
        with self._connect() as conn:
            cursor = conn.execute(
                """
                SELECT filename, target, center_x, center_y, confidence, annotated_image, created_at
                FROM detection_results
                WHERE file_hash = ?
                ORDER BY created_at DESC
                """,
                (file_hash,),
            )
            return cursor.fetchall()

    def fetch_results(
        self, limit: int = 50, search: Optional[str] = None
    ) -> List[sqlite3.Row]:
        query = (
            "SELECT filename, target, center_x, center_y, confidence, created_at FROM detection_results"
        )
        params: List[object] = []
        if search:
            query += " WHERE filename LIKE ?"
            params.append(f"%{search}%")
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self._connect() as conn:
            cursor = conn.execute(query, params)
            return cursor.fetchall()
