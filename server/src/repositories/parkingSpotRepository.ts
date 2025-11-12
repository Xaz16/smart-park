import pool from '../config/database';
import {
  ParkingSpot,
  CreateParkingSpotInput,
  UpdateParkingSpotInput,
} from '../types';

export class ParkingSpotRepository {
  async findAll(
    parkingId?: number,
    userId?: number,
    userRole?: string
  ): Promise<ParkingSpot[]> {
    // Если пользователь авторизован и является администратором парковки
    if (userId && userRole === 'parking_administrator') {
      // Если указан parking_id, возвращаем места для этой парковки
      if (parkingId) {
        const result = await pool.query(
          'SELECT * FROM parking_spot WHERE parking_id = $1 ORDER BY spot_number',
          [parkingId]
        );
        return result.rows;
      }

      // Если parking_id не указан, показываем места только своих парковок
      const result = await pool.query(
        `SELECT ps.* FROM parking_spot ps
         INNER JOIN user_parking up ON ps.parking_id = up.parking_id
         WHERE up.user_id = $1
         ORDER BY ps.spot_number`,
        [userId]
      );
      return result.rows;
    }

    // Для всех остальных (включая водителей и администраторов сервиса)
    let query = 'SELECT * FROM parking_spot';
    const params: any[] = [];

    if (parkingId) {
      query += ' WHERE parking_id = $1';
      params.push(parkingId);
    }

    query += ' ORDER BY spot_number';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: number): Promise<ParkingSpot | null> {
    const result = await pool.query(
      'SELECT * FROM parking_spot WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async findByParkingId(parkingId: number): Promise<ParkingSpot[]> {
    const result = await pool.query(
      'SELECT * FROM parking_spot WHERE parking_id = $1 ORDER BY spot_number',
      [parkingId]
    );
    return result.rows;
  }

  async create(data: CreateParkingSpotInput): Promise<ParkingSpot> {
    const {
      parking_id,
      spot_number,
      is_free = true,
      coordinates,
    } = data;

    const result = await pool.query(
      `INSERT INTO parking_spot (parking_id, spot_number, is_free, coordinates)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [parking_id, spot_number, is_free, JSON.stringify(coordinates)]
    );

    return result.rows[0];
  }

  async update(
    id: number,
    data: UpdateParkingSpotInput
  ): Promise<ParkingSpot | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'coordinates') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return null;
    }

    // Always update last_updated timestamp
    fields.push(`last_updated = CURRENT_TIMESTAMP`);

    values.push(id);
    const result = await pool.query(
      `UPDATE parking_spot SET ${fields.join(', ')}
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
    const result = await pool.query(
      'DELETE FROM parking_spot WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async getParkingId(spotId: number): Promise<number | null> {
    const result = await pool.query(
      'SELECT parking_id FROM parking_spot WHERE id = $1',
      [spotId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].parking_id;
  }
}

export const parkingSpotRepository = new ParkingSpotRepository();

