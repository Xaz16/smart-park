import pool from '../config/database';
import { Camera, CreateCameraInput, UpdateCameraInput } from '../types';

export class CameraRepository {
  async findAll(isActive?: boolean): Promise<Camera[]> {
    let query = 'SELECT * FROM camera';
    const params: any[] = [];
    
    if (isActive !== undefined) {
      query += ' WHERE is_active = $1';
      params.push(isActive);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: number): Promise<Camera | null> {
    const result = await pool.query('SELECT * FROM camera WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(data: CreateCameraInput): Promise<Camera> {
    const { name, camera_type = 'rtsp', rtsp_url, is_active = true } = data;

    const result = await pool.query(
      `INSERT INTO camera (name, camera_type, rtsp_url, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, camera_type, rtsp_url || null, is_active]
    );

    return result.rows[0];
  }

  async update(id: number, data: UpdateCameraInput): Promise<Camera | null> {
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
      `UPDATE camera SET ${fields.join(', ')}
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
    const result = await pool.query('DELETE FROM camera WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }
}

export const cameraRepository = new CameraRepository();

