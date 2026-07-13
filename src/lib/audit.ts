import { prisma } from '@/lib/prisma'
import { Log } from '@prisma/client'

interface LogPayload {
  userId?: string
  action: string
  table: string
  recordId?: string
  ipAddress?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

export async function createLog(payload: LogPayload): Promise<Log> {
  return prisma.log.create({
    data: {
      userId: payload.userId,
      action: payload.action,
      table: payload.table,
      recordId: payload.recordId,
      ipAddress: payload.ipAddress,
      oldData: payload.oldData ? JSON.stringify(payload.oldData) : null,
      newData: payload.newData ? JSON.stringify(payload.newData) : null,
    },
  })
}

export async function getLogs(options: {
  limit?: number
  offset?: number
  table?: string
  action?: string
  userId?: string
}) {
  const {
    limit = 50,
    offset = 0,
    table,
    action,
    userId,
  } = options

  return prisma.log.findMany({
    where: {
      ...(table && { table }),
      ...(action && { action }),
      ...(userId && { userId }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

export async function getLogCount(options: {
  table?: string
  action?: string
  userId?: string
}) {
  const { table, action, userId } = options

  return prisma.log.count({
    where: {
      ...(table && { table }),
      ...(action && { action }),
      ...(userId && { userId }),
    },
  })
}
