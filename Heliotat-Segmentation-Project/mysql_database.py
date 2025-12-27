"""MySQL 数据访问层 - 连接 solar_heliostat 数据库"""

from __future__ import annotations

import os
from typing import Dict, List, Optional, Any
from contextlib import contextmanager

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False
    MySQLError = Exception


class MySQLRepository:
    """MySQL database repository for solar_heliostat data."""

    def __init__(
        self,
        host: str = None,
        port: int = None,
        user: str = None,
        password: str = None,
        database: str = None,
    ):
        self.host = host or os.getenv("MYSQL_HOST", "127.0.0.1")
        self.port = port or int(os.getenv("MYSQL_PORT", "3306"))
        self.user = user or os.getenv("MYSQL_USER", "root")
        self.password = password or os.getenv("MYSQL_PASSWORD", "")
        self.database = database or os.getenv("MYSQL_DATABASE", "solar_heliostat")
        self._connection = None

    @contextmanager
    def _connect(self):
        """Context manager for database connections."""
        if not MYSQL_AVAILABLE:
            raise ImportError("mysql-connector-python is not installed. Run: pip install mysql-connector-python")

        conn = None
        try:
            conn = mysql.connector.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset="utf8mb4",
            )
            yield conn
        finally:
            if conn and conn.is_connected():
                conn.close()

    def test_connection(self) -> Dict[str, Any]:
        """Test database connection."""
        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT VERSION()")
                version = cursor.fetchone()[0]
                cursor.close()
                return {"success": True, "version": version, "message": "Connected successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ==================== Heliostat Info ====================

    def get_all_heliostats(self, limit: int = None) -> List[Dict]:
        """Get all heliostat information."""
        query = """
            SELECT
                `定日镜序号` as id,
                `Y_东坐标` as y_coord,
                `X_北坐标` as x_coord,
                `标高` as elevation,
                `环号` as ring,
                `列号` as column_num,
                `区号` as zone
            FROM heliostat_info
        """
        if limit:
            query += f" LIMIT {limit}"

        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query)
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching heliostats: {e}")
            return []

    def get_heliostats_by_zone(self, zone: str) -> List[Dict]:
        """Get heliostats by zone."""
        query = """
            SELECT
                `定日镜序号` as id,
                `Y_东坐标` as y_coord,
                `X_北坐标` as x_coord,
                `标高` as elevation,
                `环号` as ring,
                `列号` as column_num,
                `区号` as zone
            FROM heliostat_info
            WHERE `区号` = %s
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, (zone,))
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching heliostats by zone: {e}")
            return []

    def get_heliostat_count_by_zone(self) -> List[Dict]:
        """Get heliostat count grouped by zone."""
        query = """
            SELECT
                `区号` as zone,
                COUNT(*) as count
            FROM heliostat_info
            GROUP BY `区号`
            ORDER BY `区号`
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query)
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching zone counts: {e}")
            return []

    # ==================== Flight Records ====================

    def get_flight_records(self, limit: int = 50) -> List[Dict]:
        """Get flight records."""
        query = """
            SELECT
                `飞行记录序号` as id,
                `飞行记录文件地址` as file_path,
                `时间戳` as timestamp,
                `飞机名称` as drone_name
            FROM flight_records
            ORDER BY `时间戳` DESC
            LIMIT %s
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, (limit,))
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching flight records: {e}")
            return []

    def get_flight_record_by_id(self, flight_id: int) -> Optional[Dict]:
        """Get a specific flight record."""
        query = """
            SELECT
                `飞行记录序号` as id,
                `飞行记录文件地址` as file_path,
                `时间戳` as timestamp,
                `飞机名称` as drone_name
            FROM flight_records
            WHERE `飞行记录序号` = %s
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, (flight_id,))
                result = cursor.fetchone()
                cursor.close()
                return result
        except Exception as e:
            print(f"Error fetching flight record: {e}")
            return None

    # ==================== Inspection Records ====================

    def get_inspection_records(self, limit: int = 100) -> List[Dict]:
        """Get inspection records."""
        query = """
            SELECT
                `检查序号` as id,
                `定日镜序号` as heliostat_id,
                `图片路径` as image_path,
                `清洁度分析值` as cleanliness,
                `置信度` as confidence,
                `时间戳` as timestamp,
                `飞行记录序号` as flight_id
            FROM inspection_records
            ORDER BY `时间戳` DESC
            LIMIT %s
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, (limit,))
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching inspection records: {e}")
            return []

    def get_inspection_by_flight(self, flight_id: int) -> List[Dict]:
        """Get inspection records for a specific flight."""
        query = """
            SELECT
                ir.`检查序号` as id,
                ir.`定日镜序号` as heliostat_id,
                ir.`图片路径` as image_path,
                ir.`清洁度分析值` as cleanliness,
                ir.`置信度` as confidence,
                ir.`时间戳` as timestamp,
                hi.`区号` as zone
            FROM inspection_records ir
            LEFT JOIN heliostat_info hi ON ir.`定日镜序号` = hi.`定日镜序号`
            WHERE ir.`飞行记录序号` = %s
            ORDER BY ir.`时间戳` DESC
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, (flight_id,))
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching inspection by flight: {e}")
            return []

    def get_inspection_by_heliostat(self, heliostat_id: int, limit: int = 10) -> List[Dict]:
        """Get inspection history for a specific heliostat."""
        query = """
            SELECT
                `检查序号` as id,
                `图片路径` as image_path,
                `清洁度分析值` as cleanliness,
                `置信度` as confidence,
                `时间戳` as timestamp,
                `飞行记录序号` as flight_id
            FROM inspection_records
            WHERE `定日镜序号` = %s
            ORDER BY `时间戳` DESC
            LIMIT %s
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, (heliostat_id, limit))
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching inspection by heliostat: {e}")
            return []

    def get_latest_cleanliness_by_zone(self) -> List[Dict]:
        """Get latest average cleanliness by zone."""
        query = """
            SELECT
                hi.`区号` as zone,
                COUNT(DISTINCT ir.`定日镜序号`) as inspected_count,
                AVG(ir.`清洁度分析值`) as avg_cleanliness,
                MIN(ir.`清洁度分析值`) as min_cleanliness,
                MAX(ir.`清洁度分析值`) as max_cleanliness
            FROM inspection_records ir
            JOIN heliostat_info hi ON ir.`定日镜序号` = hi.`定日镜序号`
            WHERE ir.`时间戳` >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY hi.`区号`
            ORDER BY hi.`区号`
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query)
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching cleanliness by zone: {e}")
            return []

    def get_dashboard_stats(self) -> Dict:
        """Get dashboard statistics."""
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)

                # Total heliostats
                cursor.execute("SELECT COUNT(*) as total FROM heliostat_info")
                total = cursor.fetchone()["total"]

                # Average cleanliness (from recent inspections)
                cursor.execute("""
                    SELECT AVG(`清洁度分析值`) as avg_cleanliness
                    FROM inspection_records
                    WHERE `时间戳` >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                """)
                avg_result = cursor.fetchone()
                avg_cleanliness = avg_result["avg_cleanliness"] if avg_result["avg_cleanliness"] else 0

                # Mirrors needing cleaning (cleanliness < 0.75)
                cursor.execute("""
                    SELECT COUNT(DISTINCT `定日镜序号`) as need_cleaning
                    FROM inspection_records
                    WHERE `清洁度分析值` < 0.75
                    AND `时间戳` >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                """)
                need_cleaning = cursor.fetchone()["need_cleaning"]

                # Inspections this month
                cursor.execute("""
                    SELECT COUNT(DISTINCT `飞行记录序号`) as flight_count
                    FROM inspection_records
                    WHERE `时间戳` >= DATE_FORMAT(NOW(), '%Y-%m-01')
                """)
                inspections = cursor.fetchone()["flight_count"]

                # Last inspection time
                cursor.execute("""
                    SELECT MAX(`时间戳`) as last_inspection
                    FROM inspection_records
                """)
                last = cursor.fetchone()["last_inspection"]

                cursor.close()

                return {
                    "total_mirrors": total,
                    "avg_cleanliness": round(float(avg_cleanliness) * 100, 1) if avg_cleanliness else 0,
                    "mirrors_need_cleaning": need_cleaning,
                    "inspections_this_month": inspections,
                    "last_inspection": last,
                }
        except Exception as e:
            print(f"Error fetching dashboard stats: {e}")
            return {}

    # ==================== Logs ====================

    def get_logs(self, limit: int = 50, log_type: str = None) -> List[Dict]:
        """Get system logs."""
        query = """
            SELECT
                `处理序号` as id,
                `操作结果` as level,
                `操作类别` as category,
                `操作详情` as message,
                `时间戳` as timestamp
            FROM logs
        """
        params = []
        if log_type:
            query += " WHERE `操作结果` = %s"
            params.append(log_type)
        query += " ORDER BY `时间戳` DESC LIMIT %s"
        params.append(limit)

        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, tuple(params))
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching logs: {e}")
            return []

    # ==================== Personnel ====================

    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate a user."""
        query = """
            SELECT
                `用户名` as username,
                `权限` as role
            FROM personnel
            WHERE `用户名` = %s AND `密码` = %s
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, (username, password))
                result = cursor.fetchone()
                cursor.close()
                return result
        except Exception as e:
            print(f"Error authenticating user: {e}")
            return None

    def get_all_users(self) -> List[Dict]:
        """Get all users (without passwords)."""
        query = """
            SELECT
                `用户名` as username,
                `权限` as role
            FROM personnel
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query)
                results = cursor.fetchall()
                cursor.close()
                return results
        except Exception as e:
            print(f"Error fetching users: {e}")
            return []


# Singleton instance
_mysql_repo: Optional[MySQLRepository] = None


def get_mysql_repository() -> MySQLRepository:
    """Get or create the MySQL repository singleton."""
    global _mysql_repo
    if _mysql_repo is None:
        _mysql_repo = MySQLRepository()
    return _mysql_repo
