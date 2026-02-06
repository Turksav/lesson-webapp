import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Инициализация S3 клиента для Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, contentType, telegramUserId } = body;

    if (!fileName || !contentType || !telegramUserId) {
      return NextResponse.json(
        { error: 'fileName, contentType и telegramUserId обязательны' },
        { status: 400 }
      );
    }

    // Проверяем наличие переменных окружения
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
      return NextResponse.json(
        { error: 'R2 конфигурация не настроена' },
        { status: 500 }
      );
    }

    // Формируем путь к файлу: telegramUserId/fileName
    const filePath = `${telegramUserId}/${fileName}`;

    // Создаем команду для загрузки файла
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
      ContentType: contentType,
    });

    // Генерируем presigned URL (действителен 5 минут)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Формируем публичный URL для чтения файла
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${filePath}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
    });
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации URL для загрузки: ' + error.message },
      { status: 500 }
    );
  }
}
