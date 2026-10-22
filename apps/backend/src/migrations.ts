import { DataTypes, type QueryInterface } from 'sequelize';

export const migrations = [{
  name: '001-client-booking',
  async up({ context: query }: { context: QueryInterface }) {
    await query.sequelize.transaction(async (transaction) => {
      await query.createTable('masters', {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
      }, { transaction });
      await query.createTable('services', {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
        durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
      }, { transaction });
      await query.createTable('bookings', {
        queueNumber: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        requestId: { type: DataTypes.UUID, allowNull: false, unique: true },
        masterId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'masters', key: 'id' } },
        serviceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'services', key: 'id' } },
        name: { type: DataTypes.STRING(100), allowNull: false },
        phone: { type: DataTypes.STRING(16), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });
      // Demo catalog: replace before launch.
      await query.bulkInsert('masters', [
        { id: 1, name: 'Александр' }, { id: 2, name: 'Михаил' }, { id: 3, name: 'Даниил' },
      ], { transaction });
      await query.bulkInsert('services', [
        { id: 1, name: 'Мужская стрижка', durationMinutes: 45 },
        { id: 2, name: 'Оформление бороды', durationMinutes: 30 },
        { id: 3, name: 'Стрижка и борода', durationMinutes: 75 },
      ], { transaction });
    });
  },
}];
