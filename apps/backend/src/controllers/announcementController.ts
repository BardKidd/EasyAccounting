import { Request, Response } from 'express';
import Announcement from '@/models/announcement';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';

const createAnnouncement = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const { title, content, type, expiresAt } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      type,
      expiresAt, // 如果有傳這個，時間到 MongoDB 會自動刪除
    });

    res
      .status(StatusCodes.CREATED)
      .json(
        responseHelper(
          true,
          announcement,
          'Announcement created successfully',
          null
        )
      );
  });
};

const getAnnouncements = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const announcements = await Announcement.find({ isActive: true }).sort({
      createdAt: -1,
    }); // 按時間倒序

    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          announcements,
          'Get announcements successfully',
          null
        )
      );
  });
};

const updateAnnouncement = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const { id } = req.params;
    const { title, content, type, expiresAt } = req.body;

    const result = await Announcement.findByIdAndUpdate(id, {
      title,
      content,
      type,
      expiresAt,
    });

    if (result) {
      res
        .status(StatusCodes.OK)
        .json(
          responseHelper(
            true,
            result,
            'Announcement updated successfully',
            null
          )
        );
    } else {
      res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Announcement not found', null));
    }
  });
};

const deleteAnnouncement = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const { id } = req.params;

    const result = await Announcement.findByIdAndDelete(id);

    if (result) {
      res
        .status(StatusCodes.OK)
        .json(
          responseHelper(
            true,
            result,
            'Announcement deleted successfully',
            null
          )
        );
    } else {
      res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Announcement not found', null));
    }
  });
};

export default {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
};
