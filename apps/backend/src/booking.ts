import { Router } from 'express';
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from './db.js';

interface MasterAttributes { id: number; name: string }
interface ServiceAttributes { id: number; name: string; durationMinutes: number }
interface BookingAttributes {
  queueNumber: number; requestId: string; masterId: number | null;
  serviceId: number; name: string; phone: string; createdAt: Date;
}
const Master = sequelize.define<Model<MasterAttributes>>('Master', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
}, { tableName: 'masters', timestamps: false });
const Service = sequelize.define<Model<ServiceAttributes>>('Service', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'services', timestamps: false });
const Booking = sequelize.define<Model<BookingAttributes, Optional<BookingAttributes, 'queueNumber' | 'createdAt'>>>('Booking', {
  queueNumber: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  requestId: { type: DataTypes.UUID, unique: true, allowNull: false },
  masterId: { type: DataTypes.INTEGER, allowNull: true },
  serviceId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(16), allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'bookings', timestamps: false });

export class BookingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function parseBooking(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BookingError(400, 'Заполните данные записи.');
  }
  const { requestId, masterId, serviceId, name, phone } = body as Record<string, unknown>;
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new BookingError(400, 'Некорректный идентификатор запроса.');
  }
  if (masterId !== null && (!Number.isSafeInteger(masterId) || (masterId as number) < 1)) {
    throw new BookingError(400, 'Выберите мастера или вариант «Любой мастер».');
  }
  if (!Number.isSafeInteger(serviceId) || (serviceId as number) < 1) {
    throw new BookingError(400, 'Выберите услугу.');
  }
  const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (cleanName.length < 2 || cleanName.length > 100 || /[\p{Cc}\p{Cf}<>]/u.test(cleanName)) {
    throw new BookingError(400, 'Укажите имя длиной от 2 до 100 символов.');
  }
  const rawPhone = typeof phone === 'string' ? phone.trim() : '';
  if (!/^\+?[\d\s()-]+$/.test(rawPhone)) {
    throw new BookingError(400, 'Введите корректный телефон с кодом страны.');
  }
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15 || digits.startsWith('0')) {
    throw new BookingError(400, 'Введите телефон с кодом страны: от 10 до 15 цифр.');
  }
  return { requestId: requestId.toLowerCase(), masterId: masterId as number | null,
    serviceId: serviceId as number, name: cleanName, phone: `+${digits}` };
}

export const bookingRouter = Router();
bookingRouter.get('/catalog', async (_req, res) => {
  const [masters, services] = await Promise.all([
    Master.findAll({ order: [['id', 'ASC']] }), Service.findAll({ order: [['id', 'ASC']] }),
  ]);
  res.json({ masters, services });
});
bookingRouter.post('/bookings', async (req, res) => {
  const input = parseBooking(req.body);
  const result = await sequelize.transaction(async (transaction) => {
    // Serialize retries; PostgreSQL's sequence allocates unique queue numbers.
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:requestId))', {
      replacements: { requestId: input.requestId }, transaction,
    });
    const existing = await Booking.findOne({ where: { requestId: input.requestId }, transaction });
    if (existing) {
      const saved = existing.get();
      if (saved.name !== input.name || saved.phone !== input.phone ||
          saved.serviceId !== input.serviceId || saved.masterId !== input.masterId) {
        throw new BookingError(409, 'Этот запрос уже использован для другой записи. Обновите страницу.');
      }
      return { queueNumber: saved.queueNumber, replay: true };
    }
    if (!await Service.findByPk(input.serviceId, { transaction })) {
      throw new BookingError(400, 'Услуга больше не доступна. Выберите другую.');
    }
    if (input.masterId !== null && !await Master.findByPk(input.masterId, { transaction })) {
      throw new BookingError(400, 'Мастер больше не доступен. Выберите другого.');
    }
    const booking = await Booking.create(input, { transaction });
    return { queueNumber: booking.get('queueNumber'), replay: false };
  });
  res.status(result.replay ? 200 : 201).json({ queueNumber: result.queueNumber });
});
