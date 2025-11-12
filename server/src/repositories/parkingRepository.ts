import pool from '../config/database';
import { Parking, CreateParkingInput, UpdateParkingInput } from '../types';

export class ParkingRepository {
  async findAll(userId?: number, userRole?: string): Promise<Parking[]> {
    // Если пользователь авторизован и является администратором парковки,
    // показываем только его парковки
    if (userId && userRole === 'parking_administrator') {
      const result = await pool.query(
        `SELECT p.* FROM parking p
         INNER JOIN user_parking up ON p.id = up.parking_id
         WHERE up.user_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      );
      return result.rows;
    }

    // Для всех остальных (включая водителей и администраторов сервиса) - все парковки
    const result = await pool.query(
      'SELECT * FROM parking ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async findById(id: number): Promise<Parking | null> {
    const result = await pool.query('SELECT * FROM parking WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(data: CreateParkingInput): Promise<Parking> {
    const {
      name,
      address,
      total_spots = 0,
      latitude,
      longitude,
      is_active = true,
    } = data;

    const result = await pool.query(
      `INSERT INTO parking (name, address, total_spots, latitude, longitude, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, address, total_spots, latitude, longitude, is_active]
    );

    return result.rows[0];
  }

  async update(id: number, data: UpdateParkingInput): Promise<Parking | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return null;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE parking SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM parking WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }
}

export const parkingRepository = new ParkingRepository();

