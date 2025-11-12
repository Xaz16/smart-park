import pool from '../config/database';
import { AppUser, CreateAppUserInput, UpdateAppUserInput, UserRole } from '../types';

export class AppUserRepository {
  async findAll(): Promise<Omit<AppUser, 'password_hash'>[]> {
    const result = await pool.query(
      'SELECT id, username, role, is_active, created_at FROM app_user ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async findById(id: number): Promise<Omit<AppUser, 'password_hash'> | null> {
    const result = await pool.query(
      'SELECT id, username, role, is_active, created_at FROM app_user WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async findByUsername(username: string): Promise<AppUser | null> {
    const result = await pool.query(
      'SELECT * FROM app_user WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(
    data: CreateAppUserInput,
    passwordHash: string
  ): Promise<Omit<AppUser, 'password_hash'>> {
    const { username, role, is_active = true } = data;

    const result = await pool.query(
      `INSERT INTO app_user (username, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, role, is_active, created_at`,
      [username, passwordHash, role, is_active]
    );

    return result.rows[0];
  }

  async update(
    id: number,
    data: UpdateAppUserInput,
    passwordHash?: string
  ): Promise<Omit<AppUser, 'password_hash'> | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Если пароль указан, добавляем его хэш
    if (passwordHash) {
      fields.push(`password_hash = $${paramCount}`);
      values.push(passwordHash);
      paramCount++;
    }

    // Обрабатываем остальные поля
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'password') {
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
      `UPDATE app_user SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, role, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM app_user WHERE id = $1', [
      id,
    ]);
    return (result.rowCount || 0) > 0;
  }
}

export const appUserRepository = new AppUserRepository();

