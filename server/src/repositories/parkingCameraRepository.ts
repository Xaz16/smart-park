import pool from '../config/database';
import { ParkingCamera } from '../types';

export class ParkingCameraRepository {
  async findAll(
    parkingId?: number,
    cameraId?: number
  ): Promise<ParkingCamera[]> {
    let query = 'SELECT * FROM parking_camera WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (parkingId) {
      query += ` AND parking_id = $${paramCount}`;
      params.push(parkingId);
      paramCount++;
    }

    if (cameraId) {
      query += ` AND camera_id = $${paramCount}`;
      params.push(cameraId);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: number): Promise<ParkingCamera | null> {
    const result = await pool.query(
      'SELECT * FROM parking_camera WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(
    parkingId: number,
    cameraId: number
  ): Promise<ParkingCamera> {
    const result = await pool.query(
      `INSERT INTO parking_camera (parking_id, camera_id)
       VALUES ($1, $2)
       RETURNING *`,
      [parkingId, cameraId]
    );

    return result.rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM parking_camera WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async deleteByRelation(
    parkingId: number,
    cameraId: number
  ): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM parking_camera WHERE parking_id = $1 AND camera_id = $2',
      [parkingId, cameraId]
    );
    return (result.rowCount || 0) > 0;
  }
}

export const parkingCameraRepository = new ParkingCameraRepository();

