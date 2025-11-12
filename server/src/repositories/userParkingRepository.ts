import pool from '../config/database';
import { UserParking } from '../types';

export class UserParkingRepository {
  async findAll(userId?: number, parkingId?: number): Promise<UserParking[]> {
    let query = 'SELECT * FROM user_parking WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (userId) {
      query += ` AND user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (parkingId) {
      query += ` AND parking_id = $${paramCount}`;
      params.push(parkingId);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: number): Promise<UserParking | null> {
    const result = await pool.query(
      'SELECT * FROM user_parking WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(userId: number, parkingId: number): Promise<UserParking> {
    const result = await pool.query(
      `INSERT INTO user_parking (user_id, parking_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, parkingId]
    );

    return result.rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM user_parking WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async deleteByRelation(userId: number, parkingId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM user_parking WHERE user_id = $1 AND parking_id = $2',
      [userId, parkingId]
    );
    return (result.rowCount || 0) > 0;
  }

  async checkAccess(userId: number, parkingId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT * FROM user_parking WHERE user_id = $1 AND parking_id = $2',
      [userId, parkingId]
    );
    return result.rows.length > 0;
  }
}

export const userParkingRepository = new UserParkingRepository();

