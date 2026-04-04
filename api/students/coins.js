import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { studentId, coins } = req.body;

    if (!studentId || typeof coins !== 'number') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // 更新学生积分
    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: { coins: coins }
    });

    res.status(200).json({
      success: true,
      data: updatedStudent
    });
  } catch (error) {
    console.error('Update student coins error:', error);
    res.status(500).json({ error: 'Failed to update student coins' });
  }
}