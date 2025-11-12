import pool from '../config/database';
import {
  ParkingHistory,
  CreateParkingHistoryInput,
} from '../types';

export class ParkingHistoryRepository {
  async findAll(
    parkingId?: number,
    startDate?: string,
    endDate?: string,
    userId?: number,
    userRole?: string
  ): Promise<ParkingHistory[]> {
    // Если пользователь авторизован и является администратором парковки
    if (userId && userRole === 'parking_administrator') {
      let query = `SELECT ph.* FROM parking_history ph
                   INNER JOIN user_parking up ON ph.parking_id = up.parking_id
                   WHERE up.user_id = $1`;
      const params: any[] = [userId];
      let paramCount = 2;

      if (parkingId) {
        query += ` AND ph.parking_id = $${paramCount}`;
        params.push(parkingId);
        paramCount++;
      }

      if (startDate) {
        query += ` AND ph.recorded_at >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND ph.recorded_at <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
      }

      query += ' ORDER BY ph.recorded_at DESC';

      const result = await pool.query(query, params);
      return result.rows;
    }

    // Для всех остальных (включая водителей и администраторов сервиса)
    let query = 'SELECT * FROM parking_history WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (parkingId) {
      query += ` AND parking_id = $${paramCount}`;
      params.push(parkingId);
      paramCount++;
    }

    if (startDate) {
      query += ` AND recorded_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND recorded_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ' ORDER BY recorded_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: number): Promise<ParkingHistory | null> {
    const result = await pool.query(
      'SELECT * FROM parking_history WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(data: CreateParkingHistoryInput): Promise<ParkingHistory> {
    const { parking_id, spots_state } = data;

    const result = await pool.query(
      `INSERT INTO parking_history (parking_id, spots_state)
       VALUES ($1, $2)
       RETURNING *`,
      [parking_id, JSON.stringify(spots_state)]
    );

    return result.rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM parking_history WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async getParkingId(historyId: number): Promise<number | null> {
    const result = await pool.query(
      'SELECT parking_id FROM parking_history WHERE id = $1',
      [historyId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].parking_id;
  }
}

export const parkingHistoryRepository = new ParkingHistoryRepository();

