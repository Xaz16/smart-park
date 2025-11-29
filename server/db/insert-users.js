#!/usr/bin/env node

/**
 * Скрипт для создания пользователей в базе данных
 * 
 * Использование:
 *   node db/insert-users.js
 * 
 * Или через docker:
 *   docker exec -i smart-park-server node /app/db/insert-users.js
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Конфигурация базы данных из переменных окружения или значения по умолчанию
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'smart_parking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Определяем пользователей для создания
const users = [
  {
    username: 'superadmin',
    password: 'SuperAdmin2024!',
    role: 'service_admin',
    description: 'Суперадминистратор системы'
  },
  {
    username: 'admin1',
    password: 'Admin123!',
    role: 'parking_administrator',
    description: 'Администратор парковки #1'
  },
  {
    username: 'admin2',
    password: 'Admin456!',
    role: 'parking_administrator',
    description: 'Администратор парковки #2'
  },
  {
    username: 'admin3',
    password: 'Admin789!',
    role: 'parking_administrator',
    description: 'Администратор парковки #3'
  }
];

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function insertUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Начинаем создание пользователей...\n');
    
    const createdUsers = [];
    
    for (const user of users) {
      try {
        // Проверяем, существует ли пользователь
        const checkResult = await client.query(
          'SELECT id FROM app_user WHERE username = $1',
          [user.username]
        );
        
        if (checkResult.rows.length > 0) {
          console.log(`⚠️  Пользователь "${user.username}" уже существует, пропускаем...`);
          continue;
        }
        
        // Хешируем пароль
        const passwordHash = await hashPassword(user.password);
        
        // Вставляем пользователя
        const result = await client.query(
          `INSERT INTO app_user (username, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4)
           RETURNING id, username, role, is_active, created_at`,
          [user.username, passwordHash, user.role, true]
        );
        
        const createdUser = result.rows[0];
        createdUsers.push({
          ...user,
          id: createdUser.id,
          created_at: createdUser.created_at
        });
        
        console.log(`✅ Создан пользователь: ${user.username} (${user.description})`);
      } catch (error) {
        console.error(`❌ Ошибка при создании пользователя "${user.username}":`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 СОЗДАННЫЕ ПОЛЬЗОВАТЕЛИ:');
    console.log('='.repeat(70) + '\n');
    
    // Выводим суперадмина отдельно
    const superAdmin = createdUsers.find(u => u.role === 'service_admin');
    if (superAdmin) {
      console.log('🔑 СУПЕРАДМИНИСТРАТОР:');
      console.log('─'.repeat(70));
      console.log(`   Логин:    ${superAdmin.username}`);
      console.log(`   Пароль:   ${superAdmin.password}`);
      console.log(`   Роль:     ${superAdmin.role}`);
      console.log(`   ID:       ${superAdmin.id}`);
      console.log('');
    }
    
    // Выводим администраторов парковок
    const parkingAdmins = createdUsers.filter(u => u.role === 'parking_administrator');
    if (parkingAdmins.length > 0) {
      console.log('👥 АДМИНИСТРАТОРЫ ПАРКОВОК:');
      console.log('─'.repeat(70));
      parkingAdmins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.description}`);
        console.log(`      Логин:    ${admin.username}`);
        console.log(`      Пароль:   ${admin.password}`);
        console.log(`      Роль:     ${admin.role}`);
        console.log(`      ID:       ${admin.id}`);
        console.log('');
      });
    }
    
    console.log('='.repeat(70));
    console.log(`\n✨ Всего создано пользователей: ${createdUsers.length}`);
    console.log('💡 Сохраните эти данные в безопасном месте!\n');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Запускаем скрипт
insertUsers().catch(error => {
  console.error('❌ Неожиданная ошибка:', error);
  process.exit(1);
});

