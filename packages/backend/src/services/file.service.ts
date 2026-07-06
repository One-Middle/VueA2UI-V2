import type { UploadedFileDto } from "@a2ui-platform/shared";
import path from "node:path";
import fs from "node:fs/promises";
import { logger } from "../logger.js";
import { fileRepository } from "../repositories/file.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { notFound, badRequest } from "../utils/errors.js";

/**
 * 文件上传服务——校验扩展名、读取内容、持久化到数据库。
 * MVP 阶段仅允许 .txt 文件。
 */
export const fileService = {
  /**
   * 上传文件到指定 session。
   */
  async upload(
    sessionId: string,
    file: Express.Multer.File
  ): Promise<{ file: UploadedFileDto }> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw notFound("Session", sessionId);

    // 校验扩展名为 .txt
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".txt") {
      throw badRequest("仅允许上传 .txt 文件", "UNSUPPORTED_FILE_TYPE");
    }

    // 校验文件大小（最大 1MB）
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      throw badRequest("文件大小超过 1MB 限制", "FILE_TOO_LARGE");
    }

    // 读取 UTF-8 内容
    let content: string;
    try {
      content = await fs.readFile(file.path, "utf-8");
    } catch {
      throw badRequest("无法读取文件内容", "FILE_READ_ERROR");
    }

    // 持久化到数据库
    const uploaded = await fileRepository.create({
      session: { connect: { id: sessionId } },
      originalName: file.originalname,
      mimeType: file.mimetype || "text/plain",
      extension: ".txt",
      sizeBytes: file.size,
      encoding: "utf-8",
      content,
      status: "ready",
      metadata: {},
    });

    logger.info({ sessionId, fileId: uploaded.id, originalName: file.originalname }, "文件已上传");

    return {
      file: {
        id: uploaded.id,
        sessionId: uploaded.sessionId,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        extension: uploaded.extension as ".txt",
        sizeBytes: uploaded.sizeBytes,
        encoding: uploaded.encoding,
        status: uploaded.status as UploadedFileDto["status"],
        createdAt: uploaded.createdAt.toISOString(),
        content: uploaded.content,
      },
    };
  },

  /**
   * 查询 session 下的文件列表（不含内容）。
   */
  async listBySession(sessionId: string) {
    const files = await fileRepository.findBySessionId(sessionId);
    return {
      items: files.map((f) => ({
        id: f.id,
        sessionId: f.sessionId,
        originalName: f.originalName,
        mimeType: f.mimeType,
        extension: f.extension as ".txt",
        sizeBytes: f.sizeBytes,
        encoding: f.encoding,
        status: f.status as UploadedFileDto["status"],
        createdAt: f.createdAt.toISOString(),
      })) as UploadedFileDto[],
    };
  },

  /**
   * 获取单个文件详情，可通过 includeContent 控制是否包含文件正文。
   */
  async getById(
    sessionId: string,
    fileId: string,
    includeContent = false
  ): Promise<{ file: UploadedFileDto }> {
    const file = await fileRepository.findById(fileId);
    if (!file || file.sessionId !== sessionId) {
      throw notFound("UploadedFile", fileId);
    }

    const dto: UploadedFileDto = {
      id: file.id,
      sessionId: file.sessionId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      extension: file.extension as ".txt",
      sizeBytes: file.sizeBytes,
      encoding: file.encoding,
      status: file.status as UploadedFileDto["status"],
      createdAt: file.createdAt.toISOString(),
    };

    if (includeContent) {
      dto.content = file.content;
    }

    return { file: dto };
  },

  /**
   * 软删除文件。
   */
  async delete(sessionId: string, fileId: string): Promise<void> {
    const file = await fileRepository.findById(fileId);
    if (!file || file.sessionId !== sessionId) {
      throw notFound("UploadedFile", fileId);
    }

    await fileRepository.softDelete(fileId);
    logger.info({ sessionId, fileId }, "文件已软删除");
  },
};
